import { useState, useEffect, useRef, useMemo } from 'react';
import { Calendar, Filter, Plus, Search, Trash2, Edit2, Eye, X, User, Layers, Landmark, Wallet, FileText, AlertCircle, TrendingUp, Receipt } from 'lucide-react';
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
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-brand-600 to-brand-400 rounded-xl shadow-[0_4px_12px_rgba(234,88,12,0.3)] relative group overflow-hidden">
                <FileText className="h-5 w-5 text-white relative z-10" />
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              </div>
              <h1 className="text-[28px] font-bold text-slate-900">Invoices</h1>
            </div>
            <p className="text-slate-500 font-medium text-[14px]">Manage your invoices & billing efficiently.</p>
          </div>
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
        </div>

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
          <div className="flex-1 min-w-[240px] relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition-colors w-4 h-4" />
            <input
              type="text"
              placeholder="Search invoice number, client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-5 py-2 bg-slate-50 border border-slate-200/60 rounded-lg text-[13px] font-medium text-slate-700 shadow-inner placeholder:text-slate-400 focus:bg-white focus:border-brand-400 focus:ring-[3px] focus:ring-brand-500/15 transition-all duration-[250ms] outline-none hover:border-slate-300 h-10"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3.5 bg-white rounded-lg border border-slate-200 hover:border-brand-300 transition-all cursor-pointer group shadow-sm h-10">
              <Receipt className="h-3.5 w-3.5 text-slate-500 group-hover:text-brand-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-[13px] py-1.5 font-medium text-slate-700 outline-none cursor-pointer"
              >
                <option value="All">All Status</option>
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Overdue">Overdue</option>
                <option value="Draft">Draft</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 px-3.5 bg-white rounded-lg border border-slate-200 hover:border-brand-300 transition-all cursor-pointer group shadow-sm h-10">
              <Calendar className="h-3.5 w-3.5 text-slate-500 group-hover:text-brand-500" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-transparent text-[13px] py-1.5 font-medium text-slate-700 outline-none cursor-pointer"
              >
                <option value="All">All Time</option>
                <option value="Today">Today</option>
                <option value="This Week">This Week</option>
                <option value="This Month">This Month</option>
                <option value="This Year">This Year</option>
              </select>
            </div>

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
              <button
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("All");
                  setClientFilter("");
                  setDateFilter("All");
                }}
                className="flex items-center gap-1.5 px-3.5 h-10 text-[13px] font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
              >
                <X size={14} /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="bg-slate-50/50 p-4 rounded-lg border border-slate-100 flex flex-wrap items-center gap-4 animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-1.5 px-3.5 bg-white rounded-lg border border-slate-200 hover:border-brand-300 transition-all cursor-pointer group shadow-sm h-10 min-w-[200px]">
              <User className="h-3.5 w-3.5 text-slate-500 group-hover:text-brand-500" />
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="bg-transparent text-[13px] py-1.5 font-medium text-slate-700 outline-none cursor-pointer w-full"
              >
                <option value="">All Clients</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.company_name || c.client_name}>
                    {c.company_name || c.client_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-4 md:px-6 md:py-5 border-b border-gray-100 flex flex-col lg:flex-row justify-between items-start lg:items-center bg-gray-50/50 gap-4">
          <h3 className="font-bold text-slate-800">Invoices List</h3>
          <span className="text-xs font-semibold text-slate-500 bg-gray-100 px-2 py-1 rounded-lg">
            {invoicesLoading ? 'Loading...' : invoicesMeta
              ? `Showing ${(invoicesMeta.current_page - 1) * invoicesMeta.per_page + 1}–${Math.min(invoicesMeta.current_page * invoicesMeta.per_page, invoicesMeta.total)} of ${invoicesMeta.total}`
              : `Showing ${filteredInvoices.length} of ${invoices.length}`}
          </span>
        </div>
        <div className="overflow-x-auto">
          {invoicesLoading ? (
            <TableSkeleton rows={6} cols={6} />
          ) : (
          <table className="w-full text-sm text-left min-w-[700px]">
            <thead className="bg-slate-50/80 text-[13px] font-semibold text-slate-600 capitalize tracking-normal border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Invoice #</th>
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
                  <td className="px-6 py-4 font-mono font-bold text-slate-800">{inv.invoice_number || `#${inv.id}`}</td>
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
                      <button
                        onClick={() => setViewingInvoice(inv)}
                        className="p-2 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                        title="View"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => { setEditingInvoice(inv); setIsFormOpen(true); }}
                        className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(inv.id)}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500 italic">
                    No invoices found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          )}
        </div>
        {invoicesMeta && invoicesMeta.last_page > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
            <span className="text-sm text-slate-600">
              Page {invoicesMeta.current_page} of {invoicesMeta.last_page}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={invoicesMeta.current_page <= 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-slate-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={invoicesMeta.current_page >= invoicesMeta.last_page}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-slate-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
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
