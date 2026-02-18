import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Plus, Search, Edit2, Trash2, Building2, Phone, Mail, MapPin, Eye, Users, CheckCircle, Receipt, FileText } from 'lucide-react';
import { getClients, getClientLocations, saveClient, deleteClient } from '../services/db';
import ClientForm from '../components/ClientForm';
import { useLocation } from 'react-router-dom';

const SummaryCard = ({ title, description, value, icon: Icon, iconBgClass, iconColorClass }) => (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">{title}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{value}</p>
                <p className="text-xs text-slate-400 mt-1.5">{description}</p>
            </div>
            <div className={`flex-shrink-0 p-3 rounded-xl shadow-sm border ${iconBgClass} ${iconColorClass}`}>
                <Icon className="w-6 h-6" />
            </div>
        </div>
    </div>
);

const defaultFilters = {
    search: '',
    statusFilter: 'all',
    gstFilter: 'all',
    locationFilter: '',
    dateFilter: 'all',
    dateFrom: '',
    dateTo: '',
};

const ClientManagement = () => {
    const [clients, setClients] = useState([]);
    const [locations, setLocations] = useState([]);
    const [search, setSearch] = useState(defaultFilters.search);
    const [statusFilter, setStatusFilter] = useState(defaultFilters.statusFilter);
    const [gstFilter, setGstFilter] = useState(defaultFilters.gstFilter);
    const [locationFilter, setLocationFilter] = useState(defaultFilters.locationFilter);
    const [dateFilter, setDateFilter] = useState(defaultFilters.dateFilter);
    const [dateFrom, setDateFrom] = useState(defaultFilters.dateFrom);
    const [dateTo, setDateTo] = useState(defaultFilters.dateTo);
    const [searchDebounced, setSearchDebounced] = useState('');
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

    useEffect(() => {
        const t = setTimeout(() => setSearchDebounced(search.trim()), 300);
        return () => clearTimeout(t);
    }, [search]);

    const buildFilters = () => ({
        search: searchDebounced || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        gstType: gstFilter === 'all' ? undefined : gstFilter,
        location: locationFilter || undefined,
        dateRange: dateFilter === 'all' ? undefined : dateFilter,
        dateFrom: dateFilter === 'custom' && dateFrom ? dateFrom : undefined,
        dateTo: dateFilter === 'custom' && dateTo ? dateTo : undefined,
    });

    const fetchClients = async () => {
        setIsLoading(true);
        try {
            const data = await getClients(buildFilters());
            setClients(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error fetching clients", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchClients();
    }, [searchDebounced, statusFilter, gstFilter, locationFilter, dateFilter, dateFrom, dateTo]);

    useEffect(() => {
        getClientLocations().then(setLocations);
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
            const data = error.response?.data;
            const message = data?.message
                || (data?.errors && Object.values(data.errors).flat()[0])
                || "Failed to save client. Please try again.";
            toast.error(typeof message === 'string' ? message : "Failed to save client. Please try again.");
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

    const totalClients = clients.length;
    const activeClients = clients.filter(c => !c.status || c.status === 'active').length;
    const gstClients = clients.filter(c => c.gst_number && String(c.gst_number).trim()).length;
    const nonGstClients = totalClients - gstClients;

    const resetFilters = () => {
        setSearch(defaultFilters.search);
        setSearchDebounced('');
        setStatusFilter(defaultFilters.statusFilter);
        setGstFilter(defaultFilters.gstFilter);
        setLocationFilter(defaultFilters.locationFilter);
        setDateFilter(defaultFilters.dateFilter);
        setDateFrom(defaultFilters.dateFrom);
        setDateTo(defaultFilters.dateTo);
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto animate-fade-in space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Client Management</h1>
                <p className="text-slate-500 mt-1 text-lg">Manage your client companies and their business details.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard
                    title="Total Clients"
                    description="Total number of clients"
                    value={totalClients}
                    icon={Users}
                    iconBgClass="bg-blue-50 border-blue-100"
                    iconColorClass="text-blue-600"
                />
                <SummaryCard
                    title="Active Clients"
                    description="Number of active clients"
                    value={activeClients}
                    icon={CheckCircle}
                    iconBgClass="bg-emerald-50 border-emerald-100"
                    iconColorClass="text-emerald-600"
                />
                <SummaryCard
                    title="GST Clients"
                    description="Clients with GST Number"
                    value={gstClients}
                    icon={Receipt}
                    iconBgClass="bg-purple-50 border-purple-100"
                    iconColorClass="text-purple-600"
                />
                <SummaryCard
                    title="Non GST Clients"
                    description="Clients without GST Number"
                    value={nonGstClients}
                    icon={FileText}
                    iconBgClass="bg-amber-50 border-amber-100"
                    iconColorClass="text-amber-600"
                />
            </div>

            {/* FILTER SECTION - same style as Income */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex flex-col lg:flex-row gap-4 flex-wrap items-end">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search clients..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-white border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 w-full transition-all shadow-sm"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="flex-1 lg:flex-none px-4 py-2 bg-white border border-gray-100 rounded-xl text-sm font-medium text-slate-600 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 cursor-pointer transition-all hover:border-gray-200 shadow-sm min-w-[140px]"
                    >
                        <option value="all">All Clients</option>
                        <option value="active">Active Clients</option>
                        <option value="inactive">Inactive Clients</option>
                    </select>
                    <select
                        value={gstFilter}
                        onChange={(e) => setGstFilter(e.target.value)}
                        className="flex-1 lg:flex-none px-4 py-2 bg-white border border-gray-100 rounded-xl text-sm font-medium text-slate-600 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 cursor-pointer transition-all hover:border-gray-200 shadow-sm min-w-[140px]"
                    >
                        <option value="all">All</option>
                        <option value="gst">GST Clients</option>
                        <option value="nongst">Non GST Clients</option>
                    </select>
                    <select
                        value={locationFilter}
                        onChange={(e) => setLocationFilter(e.target.value)}
                        className="flex-1 lg:flex-none px-4 py-2 bg-white border border-gray-100 rounded-xl text-sm font-medium text-slate-600 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 cursor-pointer transition-all hover:border-gray-200 shadow-sm min-w-[160px]"
                    >
                        <option value="">All Locations</option>
                        {locations.map((loc) => (
                            <option key={loc} value={loc}>{loc}</option>
                        ))}
                    </select>
                    <select
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="flex-1 lg:flex-none px-4 py-2 bg-white border border-gray-100 rounded-xl text-sm font-medium text-slate-600 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 cursor-pointer transition-all hover:border-gray-200 shadow-sm min-w-[120px]"
                    >
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                        <option value="custom">Custom Range</option>
                    </select>
                    {dateFilter === 'custom' && (
                        <div className="flex flex-wrap gap-2 items-center">
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="px-4 py-2 bg-white border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                            />
                            <span className="text-slate-400 text-sm">to</span>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="px-4 py-2 bg-white border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                            />
                        </div>
                    )}
                    <div className="flex items-center gap-2 ml-auto flex-wrap">
                        <button
                            type="button"
                            onClick={resetFilters}
                            className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-gray-50 transition-colors"
                        >
                            Reset Filters
                        </button>
                        <button
                            onClick={handleAddNew}
                            className="btn-primary flex items-center gap-2 shadow-lg shadow-brand-500/30 h-[38px]"
                        >
                            <Plus className="h-5 w-5" />
                            Add Client
                        </button>
                    </div>
                </div>
            </div>

            <div className="card p-0 overflow-hidden min-h-[500px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50/50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4">Client / Company</th>
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
                            ) : clients.length > 0 ? clients.map((client) => (
                                <tr key={client.id} className="hover:bg-gray-50/80 transition-colors group">
                                    <td className="px-6 py-4 text-gray-900">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 text-brand-600 flex items-center justify-center shadow-sm">
                                                {client.company_logo ? (
                                                    <img src={client.company_logo} alt={client.company_name || client.client_name} className="h-10 w-10 rounded-xl object-cover" />
                                                ) : (
                                                    <Building2 className="h-5 w-5" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800">{client.company_name || client.client_name || '—'}</div>
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
