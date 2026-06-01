import { useState, useEffect, useMemo } from 'react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, X, Building2, Phone, Mail, MapPin, Eye, Users, CheckCircle, Receipt, FileText, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Filter, ChevronRight, Clock, Activity, Tag, Settings2, Calendar } from 'lucide-react';
import { useClients, useClientLocations, useSaveClient, useDeleteClient } from '../hooks/useApiQueries';
import ClientForm from '../components/ClientForm';
import { useLocation } from 'react-router-dom';
import { TableSkeleton } from '../components/Skeleton';
import PageHeader from '../components/ui/PageHeader';
import ToolbarSearch from '../components/ui/ToolbarSearch';
import EmptyState from '../components/ui/EmptyState';
import { FilterSelect, ClearFiltersButton } from '../components/ui/FilterControls';
import { TablePagination } from '../components/ui/DataTableSection';
import { ActionDropdownMenu } from '../components/ui/TableRowActions';

const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="bg-white p-8 rounded-[32px] border-2 border-slate-50 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500 group relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
            <Icon size={120} />
        </div>
        <div className="relative z-10">
            <div className={`h-14 w-14 rounded-2xl ${color} flex items-center justify-center text-white mb-6 shadow-lg`}>
                <Icon size={24} />
            </div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{title}</p>
            <h3 className="text-4xl font-black text-slate-900 tracking-tight">{value}</h3>
        </div>
    </div>
);

const CompanyAvatar = ({ name, logo }) => {
    const initials = name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '??';
    
    if (logo) return <img src={logo} alt={name} className="h-12 w-12 rounded-xl object-cover border-2 border-white shadow-sm" />;

    return (
        <div className="h-12 w-12 rounded-xl flex items-center justify-center text-[13px] font-black border-2 border-indigo-50 bg-indigo-50/50 text-indigo-600">
            {initials}
        </div>
    );
};

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
    const [search, setSearch] = useState(defaultFilters.search);
    const [statusFilter, setStatusFilter] = useState(defaultFilters.statusFilter);
    const [gstFilter, setGstFilter] = useState(defaultFilters.gstFilter);
    const [locationFilter, setLocationFilter] = useState(defaultFilters.locationFilter);
    const [dateFilter, setDateFilter] = useState(defaultFilters.dateFilter);
    const [dateFrom, setDateFrom] = useState(defaultFilters.dateFrom);
    const [dateTo, setDateTo] = useState(defaultFilters.dateTo);
    const [searchDebounced, setSearchDebounced] = useState('');
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingClient, setEditingClient] = useState(null);
    const [isViewMode, setIsViewMode] = useState(false);
    const [openMenuId, setOpenMenuId] = useState(null);

    const location = useLocation();

    const filters = useMemo(() => ({
        search: searchDebounced || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        gstType: gstFilter === 'all' ? undefined : gstFilter,
        location: (locationFilter === 'all' || !locationFilter) ? undefined : locationFilter,
        dateRange: dateFilter === 'all' ? undefined : dateFilter,
        dateFrom: dateFilter === 'custom' && dateFrom ? dateFrom : undefined,
        dateTo: dateFilter === 'custom' && dateTo ? dateTo : undefined,
        page: currentPage,
        per_page: 20,
    }), [searchDebounced, statusFilter, gstFilter, locationFilter, dateFilter, dateFrom, dateTo, currentPage]);

    const { data: clientsResult, isLoading } = useClients(filters);
    const { data: locations = [] } = useClientLocations();
    const saveClientMutation = useSaveClient();
    const deleteClientMutation = useDeleteClient();

    const clients = Array.isArray(clientsResult?.data) ? clientsResult.data : [];
    const clientsMeta = clientsResult?.meta ?? null;
    const totalClientsCount = clientsMeta?.total ?? clients.length;

    useEffect(() => {
        if (location.state && location.state.openForm) {
            setEditingClient(null);
            setIsViewMode(false);
            setIsFormOpen(true);
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    useEffect(() => {
        const t = setTimeout(() => setSearchDebounced(search.trim()), 300);
        return () => clearTimeout(t);
    }, [search]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchDebounced, statusFilter, gstFilter, locationFilter, dateFilter, dateFrom, dateTo]);

    const handleSave = async (clientData) => {
        try {
            await saveClientMutation.mutateAsync(clientData);
            setIsFormOpen(false);
            setEditingClient(null);
            toast.success("Customer saved");
        } catch (error) {
            console.error("Failed to save client", error);
            const data = error.response?.data;
            const message = data?.message
                || (data?.errors && Object.values(data.errors).flat()[0])
                || "Failed to save customer. Please try again.";
            toast.error(typeof message === 'string' ? message : "Failed to save customer. Please try again.");
            throw error;
        }
    };

    const handleDelete = async (id) => {
        if (confirm('Are you sure you want to delete this customer?')) {
            try {
                await deleteClientMutation.mutateAsync(id);
                toast.success("Customer deleted");
            } catch (error) {
                console.error("Failed to delete client", error);
                toast.error("Failed to delete customer");
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

    const hasActiveFilters = search || statusFilter !== 'all' || gstFilter !== 'all' || locationFilter || dateFilter !== 'all';

    const totalClients = totalClientsCount;
    const activeClients = clients.filter(c => !c.status || c.status === 'active').length;
    const gstClients = clients.filter(c => c.gst_number && String(c.gst_number).trim()).length;

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
        <div className="bg-[#fcfcfd] min-h-screen">
            <div className="p-8 md:p-12 space-y-12 max-w-[1600px] mx-auto animate-in fade-in duration-700">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div className="space-y-2">
                        <h1 className="text-[40px] font-black text-slate-900 tracking-tight leading-none">Customers</h1>
                        <p className="text-[15px] font-bold text-slate-400 max-w-xl">Manage your customer relationships.</p>
                    </div>
                    <button
                        onClick={handleAddNew}
                        className="btn-primary h-14 px-8 flex items-center gap-3 shadow-xl shadow-indigo-500/20 rounded-2xl active:scale-95 transition-all"
                    >
                        <Plus size={20} strokeWidth={3} />
                        <span className="text-[14px] font-black uppercase tracking-widest">New Customer</span>
                    </button>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    <StatCard title="Total Customers" value={totalClients} icon={Users} color="bg-indigo-600" />
                    <StatCard title="Active Customers" value={activeClients} icon={CheckCircle} color="bg-emerald-500" />
                    <StatCard title="Tax Registered" value={gstClients} icon={Receipt} color="bg-violet-600" />
                    <StatCard title="Regular Customers" value={totalClients - gstClients} icon={FileText} color="bg-orange-500" />
                </div>

                {/* Filter Infrastructure */}
                <div className="sticky top-6 z-40">
                    <div className="bg-white/80 backdrop-blur-2xl p-4 rounded-[28px] border-2 border-slate-50 shadow-2xl shadow-slate-200/50 flex flex-wrap items-center gap-4">
                        <div className="flex-1 min-w-[300px]">
                            <ToolbarSearch
                                placeholder="Search customers..."
                                value={search}
                                onChange={setSearch}
                                className="!bg-slate-50/50 !border-slate-100 !rounded-2xl !h-14 !px-6 !text-[14px] font-bold"
                            />
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <FilterSelect
                                icon={Activity}
                                value={statusFilter}
                                onChange={setStatusFilter}
                                className="!h-14 !bg-slate-50/50 !border-slate-100 !rounded-2xl !px-6 !text-[12px] font-black uppercase tracking-widest"
                            >
                                <option value="all">All status</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="onboarding">Onboarding</option>
                            </FilterSelect>

                            <button 
                                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                                className={clsx(
                                    "h-14 px-6 border-2 rounded-2xl flex items-center gap-3 transition-all active:scale-95 text-[11px] font-black uppercase tracking-widest",
                                    showAdvancedFilters 
                                        ? "bg-slate-900 border-slate-900 text-white" 
                                        : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50"
                                )}
                            >
                                <Filter size={16} />
                                Filters
                            </button>

                            {hasActiveFilters && (
                                <button onClick={resetFilters} className="h-14 w-14 flex items-center justify-center bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-100 transition-all active:scale-95">
                                    <X size={20} strokeWidth={3} />
                                </button>
                            )}
                        </div>
                    </div>

                    {showAdvancedFilters && (
                        <div className="mt-4 p-8 bg-white rounded-[32px] border-2 border-slate-50 shadow-xl animate-in slide-in-from-top-4 duration-500">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Regulatory Status</label>
                                    <FilterSelect icon={Receipt} value={gstFilter} onChange={setGstFilter} className="!w-full !bg-slate-50/50 !border-slate-100 !rounded-2xl !h-14">
                                        <option value="all">Any Tax Status</option>
                                        <option value="gst">Registered</option>
                                        <option value="nongst">Unregistered</option>
                                    </FilterSelect>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Jurisdiction</label>
                                    <FilterSelect icon={MapPin} value={locationFilter} onChange={setLocationFilter} className="!w-full !bg-slate-50/50 !border-slate-100 !rounded-2xl !h-14">
                                        <option value="">All Locations</option>
                                        {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                                    </FilterSelect>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Registration Timeline</label>
                                    <FilterSelect icon={Calendar} value={dateFilter} onChange={setDateFilter} className="!w-full !bg-slate-50/50 !border-slate-100 !rounded-2xl !h-14">
                                        <option value="all">All Time</option>
                                        <option value="today">Today</option>
                                        <option value="this_month">This Month</option>
                                        <option value="custom">Custom Range</option>
                                    </FilterSelect>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Data Grid Section */}
                <div className="bg-white rounded-[40px] border-2 border-slate-50 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        {isLoading ? (
                            <TableSkeleton rows={10} cols={6} />
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b-2 border-slate-100">
                                        <th className="px-10 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Customer / Company</th>
                                        <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Status</th>
                                        <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Tags</th>
                                        <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Contact</th>
                                        <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">GSTIN</th>
                                        <th className="px-10 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y-2 divide-slate-50">
                                    {clients.length > 0 ? clients.map((client) => (
                                        <tr key={client.id} className="group hover:bg-slate-50/50 transition-all duration-300 relative">
                                            <td className="px-10 py-6">
                                                <div className="flex items-center gap-6">
                                                    <div className={clsx(
                                                        "absolute left-0 top-6 bottom-6 w-1 rounded-r-full transition-all duration-500",
                                                        (!client.status || client.status === 'active') ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]" : "bg-slate-300"
                                                    )}></div>
                                                    <CompanyAvatar name={client.company_name || client.client_name} logo={client.company_logo} />
                                                    <div className="space-y-1">
                                                        <h4 className="text-[16px] font-black text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">
                                                            {client.company_name || client.client_name || 'Anonymous Entity'}
                                                        </h4>
                                                        <div className="flex items-center gap-3 text-[12px] font-bold text-slate-400">
                                                            <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px]">ID: #{client.id}</span>
                                                            <span className="flex items-center gap-1"><MapPin size={12} /> {client.city || 'Global'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <div className={clsx(
                                                    "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all",
                                                    (!client.status || client.status === 'active') 
                                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                                                        : "bg-slate-100 text-slate-500 border border-slate-200"
                                                )}>
                                                    <div className={clsx("h-1.5 w-1.5 rounded-full animate-pulse", (!client.status || client.status === 'active') ? "bg-emerald-500" : "bg-slate-400")}></div>
                                                    {client.status || 'Active'}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-100 shadow-sm">Enterprise</span>
                                                    {client.gst_number && <span className="px-3 py-1 bg-violet-50 text-violet-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-violet-100 shadow-sm">Tax+</span>}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <div className="space-y-1">
                                                    <p className="text-[13px] font-black text-slate-800">{client.contact_person_name || 'N/A'}</p>
                                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{client.mobile_number || 'No Phone'}</p>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                {client.gst_number ? (
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-[12px] font-black text-slate-900 font-mono">{client.gst_number}</span>
                                                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Verified GSTIN</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest">Unregistered</span>
                                                )}
                                            </td>
                                            <td className="px-10 py-6 text-right">
                                                <ActionDropdownMenu
                                                    isOpen={openMenuId === client.id}
                                                    onToggle={() => setOpenMenuId(openMenuId === client.id ? null : client.id)}
                                                    onClose={() => setOpenMenuId(null)}
                                                    items={[
                                                        { label: 'View Profile', icon: Eye, onClick: () => handleView(client) },
                                                        { label: 'Edit Customer', icon: Edit2, onClick: () => handleEdit(client) },
                                                        { label: 'Delete Customer', icon: Trash2, onClick: () => handleDelete(client.id), destructive: true, separatorBefore: true },
                                                    ]}
                                                />
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="6" className="px-10 py-32 text-center">
                                                <EmptyState
                                                    icon={Building2}
                                                    title="No customers found"
                                                    description="Add a new customer to get started."
                                                    action={
                                                        <button onClick={handleAddNew} className="btn-primary px-8 py-4 flex items-center gap-3 shadow-xl shadow-indigo-500/20 rounded-2xl">
                                                            <Plus size={18} strokeWidth={3} />
                                                            <span className="text-[13px] font-black uppercase tracking-widest">Add Customer</span>
                                                        </button>
                                                    }
                                                />
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                    
                    {clientsMeta && (clientsMeta.last_page > 1) && (
                        <div className="p-10 border-t-2 border-slate-50 bg-slate-50/30">
                            <TablePagination
                                style={{}}
                                summary={`Showing ${(clientsMeta.current_page - 1) * clientsMeta.per_page + 1}–${Math.min(clientsMeta.current_page * clientsMeta.per_page, clientsMeta.total)} of ${clientsMeta.total} customers`}
                                onPrevious={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                onNext={() => setCurrentPage((p) => p + 1)}
                                previousDisabled={clientsMeta.current_page <= 1}
                                nextDisabled={clientsMeta.current_page >= clientsMeta.last_page}
                            />
                        </div>
                    )}
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
