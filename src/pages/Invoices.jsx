import { useState, useEffect, useRef, useMemo } from 'react';
import { Calendar, Filter, Plus, Trash2, Edit2, Eye, User, Layers, Landmark, Wallet, FileText, AlertCircle, TrendingUp, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useInvoices, useInvoiceSummary, useNextInvoiceNumber, useDeleteInvoice } from '../hooks/useApiQueries';
import { invalidateCache } from '../utils/apiFetch';
import { useClients } from '../hooks/useApiQueries';
import { queryKeys } from '../query/queryKeys';
import InvoiceView from '../components/InvoiceViewer';

import InvoiceForm from '../components/InvoiceForm';
import { TableSkeleton } from '../components/Skeleton';
import PageHeader from '../components/ui/PageHeader';
import ToolbarSearch from '../components/ui/ToolbarSearch';
import EmptyState from '../components/ui/EmptyState';
import { FilterSelect, ClearFiltersButton } from '../components/ui/FilterControls';
import { TableSectionHeader, TablePagination } from '../components/ui/DataTableSection';
import { ActionIconButton } from '../components/ui/TableRowActions';

function isDateInRange(dateStr, range) {
  if (!dateStr || range === 'All') return true;
  const d = new Date(dateStr);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  if (range === 'Today') return d >= todayStart && d < new Date(todayStart.getTime() + 86400000);
  if (range === 'This Week') return d >= weekStart;
  if (range === 'This Month') return d >= monthStart;
  if (range === 'This Year') return d >= yearStart;
  return true;
}

const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="card group relative overflow-hidden cursor-default !border-0 p-5 h-[140px] flex flex-col justify-between">
        {/* Top Gradient Line */}
        <div className={clsx("absolute top-0 left-0 right-0 h-[2px]", "bg-gradient-to-r from-brand-500 to-brand-300")} />
        
        <div className="flex items-start justify-between">
            <div className="flex flex-col gap-0.5">
                <p className="text-[12px] font-semibold text-slate-500 capitalize">{title.toLowerCase()}</p>
                <h3 className="text-[26px] font-bold text-slate-900 leading-none mt-1">{value}</h3>
            </div>
            <div className={clsx(
                "h-10 w-10 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110",
                color.replace('bg-', 'bg-opacity-10 '),
                color.replace('bg-', 'text-')
            )}>
                <Icon className="w-5 h-5 font-bold" />
            </div>
        </div>
        
        <div className="space-y-2 mt-4">
            <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                <div className={clsx("h-full rounded-full transition-all duration-1000", color)} style={{ width: '70%' }}></div>
            </div>
            <p className="text-[11px] text-slate-400 font-medium tracking-tight">Financial metrics</p>
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

    // Map client name back to ID if needed, or if clientFilter is already ID
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

  const summaryFilters = useMemo(() => {
    const { page, per_page, ...rest } = filters;
    return rest;
  }, [filters]);

  const { data: invoiceSummary } = useInvoiceSummary(summaryFilters);

  const { data: nextNumber, isLoading: nextInvoiceNumberLoading } = useNextInvoiceNumber(isFormOpen && !editingInvoice);
  const deleteInvoiceMutation = useDeleteInvoice();
  const queryClient = useQueryClient();

  const invoices = Array.isArray(invoicesResult?.data) ? invoicesResult.data : [];
  const invoicesMeta = invoicesResult?.meta ?? null;
  const totalInvoicesCount = invoicesMeta?.total ?? invoices.length;

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

  const filteredInvoices = invoices; // Now server-side filtered

  const handleSave = async () => {
    invalidateCache('/invoices');
    queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this invoice? Linked income/transactions will be removed.')) return;
    try {
      await deleteInvoiceMutation.mutateAsync(id);
      toast.success('Invoice deleted');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header Background Strip */}
      <div className="absolute top-0 left-0 right-0 h-80 bg-gradient-to-b from-brand-50/50 to-transparent pointer-events-none" />

      <div className="relative p-6 md:p-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        {/* Header Section */}
        <PageHeader
          title="Invoices"
          subtitle="Manage your invoices and billing efficiently."
          primaryAction={(
            <button
              onClick={() => {
                setEditingInvoice(null);
                setIsFormOpen(true);
              }}
              className="btn-primary group relative flex items-center gap-2 overflow-hidden shadow-[0_8px_20px_rgba(124,58,237,0.25)]"
            >
              {/* Shimmer Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer transition-none" />
              <Plus size={20} className="relative z-10" />
              <span className="relative z-10">New Invoice</span>
            </button>
          )}
        />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <StatCard
          title="Total Invoices"
          value={invoiceSummary != null ? String(invoiceSummary.totalInvoices ?? 0) : '—'}
          icon={FileText}
          color="bg-slate-500"
        />
        <StatCard
          title="Paid Invoices"
          value={invoiceSummary != null ? String(invoiceSummary.paidInvoices ?? 0) : '—'}
          icon={Receipt}
          color="bg-emerald-500"
        />
        <StatCard
          title="Pending"
          value={invoiceSummary != null ? String((invoiceSummary.pendingInvoices ?? 0) + (invoiceSummary.overdueInvoices ?? 0)) : '—'}
          icon={AlertCircle}
          color="bg-amber-500"
        />
        <StatCard
          title="Revenue"
          value={invoiceSummary != null ? `₹${Number(invoiceSummary.totalRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}` : '—'}
          icon={TrendingUp}
          color="bg-blue-500"
        />
      </div>

      {/* Filters Bar */}
      <div className="space-y-3">
        <div className="bg-white/70 backdrop-blur-xl px-4 py-3 rounded-lg border border-slate-100 shadow-xl shadow-slate-200/20 flex flex-wrap items-center gap-3">
          <ToolbarSearch
            placeholder="Search invoice number, client..."
            value={searchQuery}
            onChange={setSearchQuery}
          />
          
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <FilterSelect
              icon={Receipt}
              value={statusFilter}
              onChange={setStatusFilter}
            >
                <option value="All">All Status</option>
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Overdue">Overdue</option>
                <option value="Draft">Draft</option>
            </FilterSelect>

            <FilterSelect
              icon={Calendar}
              value={dateFilter}
              onChange={setDateFilter}
            >
                <option value="All">All Time</option>
                <option value="Today">Today</option>
                <option value="This Week">This Week</option>
                <option value="This Month">This Month</option>
                <option value="This Year">This Year</option>
            </FilterSelect>

            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={clsx(
                "flex items-center gap-2 px-4 h-10 rounded-lg text-[13px] font-bold transition-all border shadow-sm",
                showAdvancedFilters 
                  ? "bg-brand-50 border-brand-200 text-brand-700" 
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
            >
              <Filter className={clsx("w-4 h-4 transition-transform", showAdvancedFilters && "rotate-180")} />
              Filters
            </button>

            {(searchQuery || statusFilter !== "All" || clientFilter || dateFilter !== "All") && (
              <ClearFiltersButton
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("All");
                  setClientFilter("");
                  setDateFilter("All");
                }}
              />
            )}
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="bg-slate-50/50 p-4 rounded-lg border border-slate-100 flex flex-wrap items-center gap-4 animate-in slide-in-from-top-2 duration-300">
            <FilterSelect
              icon={User}
              value={clientFilter}
              onChange={setClientFilter}
              minWidthClass="min-w-[200px]"
            >
                <option value="">All Clients</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.company_name || c.client_name}>
                    {c.company_name || c.client_name}
                  </option>
                ))}
            </FilterSelect>
          </div>
        )}
      </div>

      <div className="card p-0 overflow-hidden">
        <TableSectionHeader
          title="Invoices List"
          summary={invoicesLoading ? 'Loading...' : invoicesMeta
            ? `Showing ${(invoicesMeta.current_page - 1) * invoicesMeta.per_page + 1}–${Math.min(invoicesMeta.current_page * invoicesMeta.per_page, invoicesMeta.total)} of ${invoicesMeta.total}`
            : `Showing ${filteredInvoices.length} of ${invoices.length}`}
        />
        <div className="overflow-x-auto">
          {invoicesLoading ? (
            <TableSkeleton rows={6} cols={6} />
          ) : (
          <table className="w-full text-xs md:text-sm text-left min-w-[700px]">
            <thead className="bg-slate-50/80 text-[13px] font-semibold text-slate-600 capitalize tracking-normal border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 sticky left-0 z-20 bg-slate-50/80">Invoice #</th>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 font-mono font-bold text-slate-800 sticky left-0 z-10 bg-white group-hover:bg-slate-50/50">{inv.invoice_number || `#${inv.id}`}</td>
                  <td className="px-6 py-4 font-medium text-slate-900">{inv.client_name || inv.clientName || '—'}</td>
                  <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                    {typeof inv.date === 'string' ? inv.date.split('T')[0] : (inv.date || '—')}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-slate-900">
                    ₹{parseFloat(inv.grand_total ?? inv.amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={clsx(
                        'badge',
                        inv.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          inv.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-rose-50 text-rose-700 border-rose-100'
                      )}
                    >
                      <span
                        className={clsx(
                          'w-1.5 h-1.5 rounded-full mr-1.5 inline-block',
                          inv.status === 'Paid' ? 'bg-emerald-500' : inv.status === 'Pending' ? 'bg-amber-500' : 'bg-rose-500'
                        )}
                      />
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <ActionIconButton onClick={() => setViewingInvoice(inv)} title="View" icon={Eye} tone="view" />
                      <ActionIconButton onClick={() => { setEditingInvoice(inv); setIsFormOpen(true); }} title="Edit" icon={Edit2} tone="edit" />
                      <ActionIconButton onClick={() => handleDelete(inv.id)} title="Delete" icon={Trash2} tone="delete" />
                    </div>
                  </td>
                </tr>
              ))}
              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-2">
                    <EmptyState
                      icon={FileText}
                      title="No invoices found"
                      description="Create a new invoice or adjust your filters."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          )}
        </div>
        {invoicesMeta && invoicesMeta.last_page > 1 && (
          <TablePagination
            summary={`Page ${invoicesMeta.current_page} of ${invoicesMeta.last_page}`}
            onPrevious={() => setCurrentPage((p) => Math.max(1, p - 1))}
            onNext={() => setCurrentPage((p) => p + 1)}
            previousDisabled={invoicesMeta.current_page <= 1}
            nextDisabled={invoicesMeta.current_page >= invoicesMeta.last_page}
          />
        )}
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
          onEdit={() => {
            setViewingInvoice(null);
            setEditingInvoice(viewingInvoice);
            setIsFormOpen(true);
          }}
          onDelete={() => {
            handleDelete(viewingInvoice.id);
            setViewingInvoice(null);
          }}
        />
      )}
      </div>
    </div>
  );
}
