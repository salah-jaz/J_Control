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

const SummaryCard = ({ title, description, value, icon: Icon, themeClass, iconClass, cardBg, borderColor, trend, trendUp }) => (
    <div className={clsx(
        "card group relative overflow-hidden cursor-default !border-0",
        cardBg
    )}>
        {/* Top Gradient Line */}
        <div className={clsx("absolute top-0 left-0 right-0 h-[2px]", themeClass.replace('bg-', 'bg-gradient-to-r from-').split(' ')[0] + " to-fuchsia-500")} />
        
        <div className="flex items-start justify-between mb-3">
            <div className="flex flex-col gap-1">
                <p className="text-[12px] font-medium text-slate-500 capitalize">{title.toLowerCase()}</p>
                <div className="flex items-center gap-2">
                    <h3 className="text-[24px] font-bold text-slate-900 leading-none">{value}</h3>
                    {trend && (
                        <div className={clsx(
                            "flex items-center gap-1 px-2.5 py-1 rounded-md text-[12px] font-medium shadow-sm transition-all duration-[250ms] group-hover:scale-[1.02]",
                            trendUp ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                        )}>
                            {trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            {trend}
                        </div>
                    )}
                </div>
            </div>
            <div className={clsx(
                "h-10 w-10 rounded-lg flex items-center justify-center transition-all duration-[250ms] group-hover:scale-110",
                iconClass,
                "shadow-sm"
            )}>
                <Icon className="w-4 h-4" />
            </div>
        </div>
        
        <div className="mt-2">
            <p className="text-[12px] text-slate-500 font-medium">{description}</p>
        </div>
    </div>
);

const CompanyAvatar = ({ name, logo }) => {
    const initials = name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '??';
    const bgColors = [
        'bg-indigo-50 text-indigo-600 border-indigo-100',
        'bg-emerald-50 text-emerald-600 border-emerald-100',
        'bg-violet-50 text-violet-600 border-violet-100',
        'bg-amber-50 text-amber-600 border-amber-100',
        'bg-rose-50 text-rose-600 border-rose-100',
    ];
    const bgColor = bgColors[name.length % bgColors.length];

    if (logo) return <img src={logo} alt={name} className="h-12 w-12 rounded-lg object-cover border-2 border-white shadow-sm" />;

    return (
        <div className={clsx("h-12 w-12 rounded-lg flex items-center justify-center text-sm font-black border", bgColor)}>
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
        location: locationFilter || undefined,
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
            toast.success("Client saved successfully");
        } catch (error) {
            console.error("Failed to save client", error);
            const data = error.response?.data;
            const message = data?.message
                || (data?.errors && Object.values(data.errors).flat()[0])
                || "Failed to save client. Please try again.";
            toast.error(typeof message === 'string' ? message : "Failed to save client. Please try again.");
            throw error;
        }
    };

    const handleDelete = async (id) => {
        if (confirm('Are you sure you want to delete this client company?')) {
            try {
                await deleteClientMutation.mutateAsync(id);
                toast.success("Client deleted successfully");
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
        <div className="min-h-screen bg-[#F8FAFC]">
            {/* Header Background Strip */}
            <div className="absolute top-0 left-0 right-0 h-80 bg-gradient-to-b from-violet-50/50 to-transparent pointer-events-none"></div>

            <div className="relative p-6 md:p-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                {/* Header Section */}
                <PageHeader
                    title="Client Management"
                    subtitle="Centralized management of your client network and business relationships."
                    primaryAction={(
                        <button
                            onClick={handleAddNew}
                            title="Create new client profile"
                            className="btn-premium group relative flex items-center gap-2 overflow-hidden shadow-[0_8px_20px_rgba(124,58,237,0.25)]"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer transition-none"></div>
                            <Plus className="h-4 w-4 stroke-[2.5]" />
                            <span className="relative z-10">Add Client</span>
                        </button>
                    )}
                />

                {/* Stats Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <SummaryCard
                        title="Total Accounts"
                        description="Global enterprise network"
                        value={totalClients}
                        icon={Users}
                        trend="+3"
                        trendUp={true}
                        cardBg="bg-blue-50/50"
                        borderColor="border-blue-100"
                        iconClass="bg-blue-100/50 text-blue-500"
                        themeClass="bg-indigo-500"
                    />
                    <SummaryCard
                        title="Active Accounts"
                        description="Verified active entities"
                        value={activeClients}
                        icon={CheckCircle}
                        trend="+2"
                        trendUp={true}
                        cardBg="bg-green-50/50"
                        borderColor="border-green-100"
                        iconClass="bg-green-100/50 text-emerald-500"
                        themeClass="bg-emerald-500"
                    />
                    <SummaryCard
                        title="Tax Registered"
                        description="Verified GST entities"
                        value={gstClients}
                        icon={Receipt}
                        trend="-1"
                        trendUp={false}
                        cardBg="bg-violet-50/50"
                        borderColor="border-violet-100"
                        iconClass="bg-violet-100/50 text-violet-600"
                        themeClass="bg-violet-500"
                    />
                    <SummaryCard
                        title="Unregistered Accounts"
                        description="Standard prospect pipeline"
                        value={totalClients - gstClients}
                        icon={FileText}
                        trend="+12%"
                        trendUp={true}
                        cardBg="bg-orange-50/50"
                        borderColor="border-orange-100"
                        iconClass="bg-orange-100/50 text-orange-500"
                        themeClass="bg-orange-400"
                    />
                </div>

                {/* Powerful Filter Bar */}
                <div className="sticky top-[88px] z-30 space-y-3">
                    <div className="bg-white/70 backdrop-blur-xl px-4 py-3 rounded-lg border border-slate-100 shadow-xl shadow-slate-200/20 flex flex-wrap items-center gap-3">
                        <ToolbarSearch
                            placeholder="Search clients by name, company, email..."
                            value={search}
                            onChange={setSearch}
                        />
                        
                        <div className="flex flex-wrap items-center gap-2 pr-1 w-full lg:w-auto">
                            <FilterSelect
                                icon={Activity}
                                value={statusFilter}
                                onChange={setStatusFilter}
                            >
                                    <option value="all">All Status</option>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                    <option value="onboarding">Onboarding</option>
                                    <option value="lead">Lead</option>
                            </FilterSelect>

                            <button 
                                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                                className={clsx(
                                    "h-10 px-3.5 border rounded-lg flex items-center gap-2 transition-all active:scale-[0.98] group/adv shadow-sm text-[13px] font-bold",
                                    showAdvancedFilters 
                                        ? "bg-violet-50 border-violet-200 text-violet-700" 
                                        : "bg-white border-slate-200 text-slate-600 hover:border-violet-300 hover:bg-slate-50"
                                )}
                            >
                                <Filter size={16} className={clsx("transition-transform", showAdvancedFilters && "rotate-180")} />
                                Filters
                            </button>

                            {hasActiveFilters && (
                                <ClearFiltersButton onClick={resetFilters} />
                            )}
                        </div>
                    </div>

                    {/* Advanced Filters */}
                    {showAdvancedFilters && (
                        <div className="bg-slate-50/50 p-4 rounded-lg border border-slate-100 flex flex-wrap items-center gap-4 animate-in slide-in-from-top-2 duration-300">
                            <FilterSelect
                                icon={Receipt}
                                value={gstFilter}
                                onChange={setGstFilter}
                                minWidthClass="min-w-[160px]"
                            >
                                    <option value="all">Any Tax Status</option>
                                    <option value="gst">Registered</option>
                                    <option value="nongst">Unregistered</option>
                            </FilterSelect>

                            <FilterSelect
                                icon={MapPin}
                                value={locationFilter}
                                onChange={setLocationFilter}
                                minWidthClass="min-w-[170px]"
                            >
                                    <option value="">All Locations</option>
                                    {locations.map(loc => (
                                        <option key={loc} value={loc}>{loc}</option>
                                    ))}
                            </FilterSelect>

                            <FilterSelect
                                icon={Calendar}
                                value={dateFilter}
                                onChange={setDateFilter}
                                minWidthClass="min-w-[160px]"
                            >
                                    <option value="all">Registration Date</option>
                                    <option value="today">Today</option>
                                    <option value="this_month">This Month</option>
                                    <option value="last_month">Last Month</option>
                                    <option value="custom">Custom Range</option>
                            </FilterSelect>

                            {dateFilter === 'custom' && (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="date"
                                        value={dateFrom}
                                        onChange={(e) => setDateFrom(e.target.value)}
                                        className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[13px] font-medium text-slate-600 outline-none focus:border-violet-400 h-10 shadow-sm"
                                    />
                                    <span className="text-slate-400 text-xs font-bold px-1">to</span>
                                    <input
                                        type="date"
                                        value={dateTo}
                                        onChange={(e) => setDateTo(e.target.value)}
                                        className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[13px] font-medium text-slate-600 outline-none focus:border-violet-400 h-10 shadow-sm"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Filter Chips */}
                    {hasActiveFilters && (
                        <div className="flex flex-wrap gap-2 px-2 animate-in fade-in slide-in-from-top-1 duration-300">
                            {statusFilter !== 'all' && (
                                <span className="flex items-center gap-2 px-3 py-1.5 bg-violet-50 text-violet-700 rounded-md text-[13px] font-medium border border-violet-100 shadow-sm">
                                    Status: <span className="capitalize">{statusFilter}</span> <X className="h-3.5 w-3.5 cursor-pointer opacity-70 hover:opacity-100" onClick={() => setStatusFilter('all')} />
                                </span>
                            )}
                            {gstFilter !== 'all' && (
                                <span className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md text-[13px] font-medium border border-blue-100 shadow-sm">
                                    Tax: <span className="capitalize">{gstFilter}</span> <X className="h-3.5 w-3.5 cursor-pointer opacity-70 hover:opacity-100" onClick={() => setGstFilter('all')} />
                                </span>
                            )}
                            {search && (
                                <span className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-md text-[13px] font-medium border border-slate-200 shadow-sm">
                                    Search: {search} <X className="h-3.5 w-3.5 cursor-pointer opacity-70 hover:opacity-100" onClick={() => setSearch('')} />
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Modern Table Component */}
                <div className="card overflow-hidden min-h-[500px] flex flex-col !p-0 mt-6 !border-0 backdrop-blur-0">
                    <div className="flex-1 overflow-x-auto">
                        {isLoading ? (
                            <TableSkeleton rows={10} cols={6} />
                        ) : (
                        <table className="table w-full text-left border-collapse text-xs md:text-sm">
                            <thead>
                                <tr className="border-b border-light">
                                    <th className="px-8 py-5 text-[14px] font-semibold text-primary w-[22%] sticky left-0 z-20 bg-white">Client / Company</th>
                                    <th className="px-6 py-5 text-[14px] font-semibold text-primary text-center">Account Status</th>
                                    <th className="px-6 py-5 text-[14px] font-semibold text-primary text-center">Category Tags</th>
                                    <th className="px-6 py-5 text-[14px] font-semibold text-primary text-center">Last Activity</th>
                                    <th className="px-6 py-5 text-[14px] font-semibold text-primary text-center">Tax Info</th>
                                    <th className="px-8 py-5 text-[14px] font-semibold text-primary text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {clients.length > 0 ? clients.map((client) => (
                                    <tr 
                                        key={client.id} 
                                        className={clsx(
                                            "group hover:bg-slate-50 hover:-translate-y-[1px] transition-all duration-[250ms] border-b border-slate-100 last:border-0 relative bg-white even:bg-slate-50/50",
                                            openMenuId === client.id ? "!z-50" : "z-0"
                                        )}
                                    >
                                        <td className="px-8 py-4 sticky left-0 z-10 bg-white group-hover:bg-slate-50">
                                            <div className="flex items-center gap-4">
                                                <div className={clsx(
                                                    "absolute left-0 top-3 bottom-3 w-1 rounded-r-full transition-all duration-300 opacity-0 group-hover:opacity-100",
                                                    (!client.status || client.status === 'active') ? "bg-emerald-500" : "bg-violet-400 shadow-[0_0_8px_rgba(139,92,246,0.2)]"
                                                )}></div>

                                                <div className="relative flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                                                    <CompanyAvatar name={client.company_name || client.client_name || '??'} logo={client.company_logo} />
                                                    <div className={clsx(
                                                        "absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-[2px] border-white transition-all shadow-sm",
                                                        (!client.status || client.status === 'active') ? "bg-emerald-500" : "bg-slate-400"
                                                    )}></div>
                                                </div>

                                                <div className="space-y-0.5">
                                                    <div className="text-[15px] font-semibold text-slate-800 leading-tight group-hover:text-violet-600 transition-colors flex items-center gap-2">
                                                        {client.company_name || client.client_name || 'Anonymous Account'}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[13px] font-medium text-slate-500">
                                                        Id: #{client.id} • {client.city || 'Generic location'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className={clsx(
                                                "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[12px] font-medium transition-all duration-300",
                                                (!client.status || client.status === 'active') 
                                                    ? "bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100" 
                                                    : client.status === 'inactive'
                                                        ? "bg-rose-50 text-rose-700 shadow-sm border border-rose-100"
                                                        : "bg-slate-50 text-slate-600 shadow-sm border border-slate-200"
                                            )}>
                                                <span className={clsx(
                                                    "h-1.5 w-1.5 rounded-full", 
                                                    (!client.status || client.status === 'active') ? "bg-emerald-500" : 
                                                    client.status === 'inactive' ? "bg-rose-500" : "bg-slate-400"
                                                )}></span>
                                                <span className="capitalize">{client.status ? client.status.toLowerCase() : 'Active'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <span className="px-3 py-1 bg-violet-50 text-violet-700 rounded-full text-[12px] font-medium border border-violet-100 shadow-sm transition-transform hover:-translate-y-[1px]">VIP</span>
                                                <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[12px] font-medium border border-blue-100 shadow-sm transition-transform hover:-translate-y-[1px]">New</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="text-[14px] font-medium text-slate-700">
                                                    {Math.floor(Math.random() * 10) + 1}h ago
                                                </span>
                                                <span className="text-[12px] text-slate-500">Login Activity</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {client.gst_number ? (
                                                    <div className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[12px] font-medium rounded-full border border-emerald-100 shadow-sm">
                                                        GST Registered
                                                    </div>
                                                ) : (
                                                    <div className="px-3 py-1 bg-slate-50 text-slate-500 text-[12px] font-medium rounded-full border border-slate-200 shadow-sm">
                                                        Basic
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-4 text-right">
                                            <ActionDropdownMenu
                                                isOpen={openMenuId === client.id}
                                                onToggle={() => setOpenMenuId(openMenuId === client.id ? null : client.id)}
                                                onClose={() => setOpenMenuId(null)}
                                                items={[
                                                    { label: 'View Profile', icon: Eye, onClick: () => handleView(client) },
                                                    { label: 'Edit Client', icon: Edit2, onClick: () => handleEdit(client) },
                                                    { label: 'Delete', icon: Trash2, onClick: () => handleDelete(client.id), destructive: true, separatorBefore: true },
                                                ]}
                                            />
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="6" className="px-8 py-24 text-center">
                                            <EmptyState
                                                icon={Building2}
                                                title="No clients found"
                                                description="Expand your portfolio by introducing new enterprise clients to the system."
                                                action={(
                                                    <button
                                                        onClick={handleAddNew}
                                                        className="px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white rounded-xl font-medium text-[14px] shadow-[0_8px_20px_rgba(124,58,237,0.25)] hover:shadow-[0_12px_24px_rgba(124,58,237,0.35)] hover:-translate-y-[2px] transition-all flex items-center gap-2 active:scale-[0.98]"
                                                    >
                                                        <Plus className="h-4 w-4 stroke-[2.5]" /> Add First Client
                                                    </button>
                                                )}
                                                className="max-w-md mx-auto"
                                            />
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        )}
                    </div>
                    
                    {clientsMeta && (clientsMeta.last_page > 1) && (
                        <TablePagination
                            summary={`Showing ${(clientsMeta.current_page - 1) * clientsMeta.per_page + 1}–${Math.min(clientsMeta.current_page * clientsMeta.per_page, clientsMeta.total)} of ${clientsMeta.total} clients`}
                            onPrevious={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            onNext={() => setCurrentPage((p) => p + 1)}
                            previousDisabled={clientsMeta.current_page <= 1}
                            nextDisabled={clientsMeta.current_page >= clientsMeta.last_page}
                        />
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
