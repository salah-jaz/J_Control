import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Calendar, Filter, Plus, Trash2, Edit2, Eye, User, Layers, Landmark, 
  Wallet, FileText, AlertCircle, TrendingUp, Receipt, Download, 
  Search, CheckCircle2, Clock, FileSpreadsheet, Briefcase, ChevronRight,
  BadgeCheck, Activity, BarChart3, PieChart as PieChartIcon, Save, X, 
  ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useInvoices, useInvoiceSummary, useNextInvoiceNumber, useDeleteInvoice } from '../hooks/useApiQueries';
import { invalidateCache } from '../utils/apiFetch';
import { useClients } from '../hooks/useApiQueries';
import { queryKeys } from '../query/queryKeys';
import InvoiceView from '../components/InvoiceViewer';
import InvoiceForm from '../components/InvoiceForm';
import { TableSkeleton } from '../components/Skeleton';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import { FilterSelect, ClearFiltersButton } from '../components/ui/FilterControls';
import { TableSectionHeader, TablePagination } from '../components/ui/DataTableSection';
import { ActionIconButton } from '../components/ui/TableRowActions';

const StatCard = ({ title, value, icon: Icon, colorClass, subValue, subLabel }) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-all group relative overflow-hidden">
    <div className="flex items-start justify-between relative z-10">
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">{title}</span>
        <h3 className="text-[26px] font-black text-slate-900 tracking-tight leading-none mt-1">{value}</h3>
      </div>
      <div className={clsx("p-2.5 rounded-xl text-white shadow-lg", colorClass)}>
        <Icon size={20} strokeWidth={2.5} />
      </div>
    </div>
    
    <div className="mt-6 relative z-10">
      <div className="flex flex-col">
        {subValue && (
          <>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">{subLabel}</span>
            <span className="text-[13px] font-black text-slate-700 tracking-tight">{subValue}</span>
          </>
        )}
        {!subValue && <p className="text-[11px] text-slate-400 font-medium tracking-tight">System calculated metrics</p>}
      </div>
    </div>
    
    <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
      <Icon size={120} />
    </div>
  </div>
);

export default function Invoices() {
  const [currentPage, setCurrentPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const { data: clientsResult } = useClients({ per_page: 100 });
  const clients = Array.isArray(clientsResult?.data) ? clientsResult.data : [];

  const filters = useMemo(() => {
    let date_from = undefined;
    let date_to = undefined;
    if (dateFilter !== 'All') {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (dateFilter === 'Today') {
        date_from = todayStart.toISOString().split('T')[0];
        date_to = date_from;
      } else if (dateFilter === 'This Week') {
        const weekStart = new Date(todayStart);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        date_from = weekStart.toISOString().split('T')[0];
      } else if (dateFilter === 'This Month') {
        date_from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      } else if (dateFilter === 'This Year') {
        date_from = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      }
    }
    const selectedClient = clients.find(c => (c.company_name || c.client_name) === clientFilter);
    return {
      search: searchQuery.trim() || undefined,
      status: statusFilter === 'All' ? undefined : statusFilter,
      client_id: selectedClient?.id || undefined,
      date_from,
      date_to,
      page: currentPage,
      per_page: 20,
    };
  }, [searchQuery, statusFilter, clientFilter, dateFilter, currentPage, clients]);

  const { data: invoicesResult, isLoading: invoicesLoading } = useInvoices(filters);
  const { data: invoiceSummary } = useInvoiceSummary(useMemo(() => {
    const { page, per_page, ...rest } = filters;
    return rest;
  }, [filters]));

  const { data: nextNumber, isLoading: nextInvoiceNumberLoading } = useNextInvoiceNumber(isFormOpen && !editingInvoice);
  const deleteInvoiceMutation = useDeleteInvoice();
  const queryClient = useQueryClient();

  const invoices = Array.isArray(invoicesResult?.data) ? invoicesResult.data : [];
  const invoicesMeta = invoicesResult?.meta ?? null;
  const nextInvoiceNumber = nextNumber ?? (isFormOpen && !editingInvoice ? `INV-${new Date().getFullYear()}-draft` : null);

  useEffect(() => {
    if (location.state?.openForm) {
      setEditingInvoice(null);
      setIsFormOpen(true);
    }
    if (location.state?.initialStatus) setStatusFilter(location.state.initialStatus);
    window.history.replaceState({}, document.title);
  }, [location]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, clientFilter, dateFilter]);

  const handleSave = async () => {
    invalidateCache('/invoices');
    queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this invoice? Linked income/transactions will be removed.')) return;
    try {
      await deleteInvoiceMutation.mutateAsync(id);
      toast.success('Invoice purged from registry');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Purge failed');
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      <PageHeader
        title="Invoicing Operations"
        subtitle="Full-cycle billing management, revenue tracking and receivable lifecycle"
        primaryAction={(
          <button onClick={() => { setEditingInvoice(null); setIsFormOpen(true); }} className="btn-primary flex items-center gap-2 shadow-lg shadow-indigo-500/20">
            <Plus size={18} strokeWidth={3} />
            <span>New Invoice</span>
          </button>
        )}
        secondaryActions={(
          <button onClick={() => toast.error("Batch export not implemented")} className="p-2 bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-50 shadow-sm"><Download size={18} /></button>
        )}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <StatCard
          title="Total Ledger Volume"
          value={invoiceSummary != null ? String(invoiceSummary.totalInvoices ?? 0) : '—'}
          icon={FileText}
          colorClass="bg-slate-800"
        />
        <StatCard
          title="Liquidity Realized"
          value={invoiceSummary != null ? String(invoiceSummary.paidInvoices ?? 0) : '—'}
          icon={BadgeCheck}
          colorClass="bg-emerald-600"
          subLabel="Paid Performance"
        />
        <StatCard
          title="Receivable Exposure"
          value={invoiceSummary != null ? String((invoiceSummary.pendingInvoices ?? 0) + (invoiceSummary.overdueInvoices ?? 0)) : '—'}
          icon={AlertCircle}
          colorClass="bg-amber-500"
          subLabel="Pending Collection"
        />
        <StatCard
          title="Gross Receivables"
          value={invoiceSummary != null ? `₹${Number(invoiceSummary.totalRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}` : '—'}
          icon={TrendingUp}
          colorClass="bg-indigo-600"
          subLabel="Aggregate Valuation"
        />
      </div>

      <div className="bg-white/80 backdrop-blur-md px-4 py-3 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-3 sticky top-4 z-20">
        <div className="flex-1 min-w-[240px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search by ID, client, or number..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[13px] font-medium outline-none focus:bg-white focus:border-indigo-500 transition-all shadow-inner"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <FilterSelect icon={Receipt} value={statusFilter} onChange={setStatusFilter}>
            <option value="All">All Status</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Overdue">Overdue</option>
            <option value="Draft">Draft</option>
          </FilterSelect>
          <FilterSelect icon={Calendar} value={dateFilter} onChange={setDateFilter}>
            <option value="All">All Time</option>
            <option value="Today">Today</option>
            <option value="This Week">This Week</option>
            <option value="This Month">This Month</option>
            <option value="This Year">This Year</option>
          </FilterSelect>
          <button onClick={() => setShowAdvancedFilters(!showAdvancedFilters)} className={clsx("p-2 border rounded-lg transition-all shadow-sm", showAdvancedFilters ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "bg-white border-slate-200 text-slate-600")}><Filter size={18} /></button>
          {(searchQuery || statusFilter !== "All" || clientFilter || dateFilter !== "All") && <ClearFiltersButton onClick={() => { setSearchQuery(""); setStatusFilter("All"); setClientFilter(""); setDateFilter("All"); }} />}
        </div>
      </div>

      {showAdvancedFilters && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-2">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Client Parameter</label>
            <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[13px] font-medium" value={clientFilter} onChange={e => setClientFilter(e.target.value)}>
              <option value="">All Clients</option>
              {clients.map(c => <option key={c.id} value={c.company_name || c.client_name}>{c.company_name || c.client_name}</option>)}
            </select>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <TableSectionHeader
          title="Billing Registry"
          summary={invoicesLoading ? 'Synchronizing...' : invoicesMeta
            ? `${(invoicesMeta.current_page - 1) * invoicesMeta.per_page + 1} – ${Math.min(invoicesMeta.current_page * invoicesMeta.per_page, invoicesMeta.total)} of ${invoicesMeta.total} records`
            : `${invoices.length} entries`}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Identification</th>
                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Client Source</th>
                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Temporal</th>
                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">Valuation</th>
                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoicesLoading ? (
                <tr><td colSpan="6" className="p-12 text-center text-slate-400 font-medium">Synchronizing ledger data...</td></tr>
              ) : invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="font-mono text-[13px] font-black text-slate-900 italic tracking-tight">{inv.invoice_number || `#${inv.id}`}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center text-[11px] font-bold text-slate-500">{inv.client_name?.[0] || '—'}</div>
                      <span className="text-[13px] font-bold text-slate-700 truncate max-w-[200px]">{inv.client_name || '—'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[12px] font-bold text-slate-500">{typeof inv.date === 'string' ? inv.date.split('T')[0] : (inv.date || '—')}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-mono text-[14px] font-black text-slate-900 italic">₹{parseFloat(inv.grand_total ?? inv.amount ?? 0).toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={clsx(
                        "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5",
                        inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
                        inv.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                        'bg-rose-100 text-rose-700'
                      )}
                    >
                      <div className={clsx('w-1 h-1 rounded-full', inv.status === 'Paid' ? 'bg-emerald-500' : inv.status === 'Pending' ? 'bg-amber-500' : 'bg-rose-500')} />
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                      <ActionIconButton onClick={() => setViewingInvoice(inv)} title="Visual Preview" icon={Eye} tone="view" />
                      <ActionIconButton onClick={() => { setEditingInvoice(inv); setIsFormOpen(true); }} title="Modify Registry" icon={Edit2} tone="edit" />
                      <ActionIconButton onClick={() => handleDelete(inv.id)} title="Purge Registry" icon={Trash2} tone="delete" />
                    </div>
                  </td>
                </tr>
              ))}
              {!invoicesLoading && invoices.length === 0 && (
                <tr><td colSpan="6" className="p-20"><EmptyState icon={FileText} title="No Billing Matches" description="Adjust your parameters or generate a new invoice to populate the registry." /></td></tr>
              )}
            </tbody>
          </table>
        </div>
        {invoicesMeta && <TablePagination summary={`Page ${invoicesMeta.current_page} of ${invoicesMeta.last_page}`} onPrevious={() => setCurrentPage(p => Math.max(1, p - 1))} onNext={() => setCurrentPage(p => p + 1)} previousDisabled={invoicesMeta.current_page <= 1} nextDisabled={invoicesMeta.current_page >= invoicesMeta.last_page} />}
      </div>

      <InvoiceForm
        isOpen={isFormOpen}
        invoice={editingInvoice}
        nextInvoiceNumber={nextInvoiceNumber}
        nextInvoiceNumberLoading={nextInvoiceNumberLoading}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSave}
      />

      {viewingInvoice && (
        <InvoiceView
          isOpen={!!viewingInvoice}
          onClose={() => setViewingInvoice(null)}
          invoice={viewingInvoice}
          onEdit={() => { setViewingInvoice(null); setEditingInvoice(viewingInvoice); setIsFormOpen(true); }}
          onDelete={() => { handleDelete(viewingInvoice.id); setViewingInvoice(null); }}
        />
      )}
    </div>
  );
}
