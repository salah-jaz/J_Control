import { useState, useEffect, useRef } from 'react';
import { Plus, Search, Trash2, Edit2, Eye, X, User, Layers, Landmark, Wallet, FileText, AlertCircle, TrendingUp, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { useLocation } from 'react-router-dom';
import { getNextInvoiceNumber, getInvoiceSummary, getInvoices, deleteInvoice } from '../services/invoiceService';
import { getClients } from '../services/db';
import InvoiceView from '../components/InvoiceView';
import InvoiceForm from '../components/InvoiceForm';

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
  <div className="card hover:border-brand-200/50 group h-36 flex flex-col justify-between p-6">
    <div className="flex justify-between items-start">
      <div className={`p-3.5 rounded-xl ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="text-right">
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <h3 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">{value}</h3>
      </div>
    </div>
    <div className="w-full bg-gray-100 h-1.5 rounded-full mt-4 overflow-hidden">
      <div className={`h-full rounded-full ${color} opacity-30`} style={{ width: '70%' }} />
    </div>
  </div>
);

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [invoiceSummary, setInvoiceSummary] = useState(null);
  const [clients, setClients] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState(null);
  const [nextInvoiceNumberLoading, setNextInvoiceNumberLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All');
  const location = useLocation();

  useEffect(() => {
    if (location.state?.openForm) {
      setEditingInvoice(null);
      setNextInvoiceNumber(null);
      setIsFormOpen(true);
    }
    if (location.state?.initialStatus) setStatusFilter(location.state.initialStatus);
    window.history.replaceState({}, document.title);
  }, [location]);

  const loadData = async () => {
    try {
      const [list, summary, clientsData] = await Promise.all([getInvoices(), getInvoiceSummary(), getClients()]);
      setInvoices(Array.isArray(list) ? list : []);
      setInvoiceSummary(summary);
      setClients(clientsData || []);
    } catch (e) {
      console.error('Failed to load invoices', e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (isFormOpen && !editingInvoice) {
      let cancelled = false;
      setNextInvoiceNumberLoading(true);
      getNextInvoiceNumber()
        .then((number) => {
          if (!cancelled) {
            setNextInvoiceNumber(number || `INV-${new Date().getFullYear()}-draft`);
            setNextInvoiceNumberLoading(false);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            console.error('Failed to load next invoice number:', err);
            const year = new Date().getFullYear();
            setNextInvoiceNumber(`INV-${year}-draft`);
            setNextInvoiceNumberLoading(false);
            toast('Invoice ID will be assigned when you save.', { icon: 'ℹ️', duration: 4000 });
          }
        });
      return () => { cancelled = true; };
    }
  }, [isFormOpen, editingInvoice]);

  const filteredInvoices = invoices.filter((inv) => {
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      const match =
        (inv.invoice_number && inv.invoice_number.toLowerCase().includes(q)) ||
        (inv.client_name && inv.client_name.toLowerCase().includes(q)) ||
        (String(inv.id).includes(q));
      if (!match) return false;
    }
    if (clientFilter) {
      const invClientName = inv.client_name || inv.clientName;
      const matchName = clients.find((c) => (c.company_name || c.client_name) === clientFilter);
      const nameMatch = invClientName === clientFilter || (matchName && inv.client_id == matchName.id);
      if (!nameMatch) return false;
    }
    if (statusFilter !== 'All' && inv.status !== statusFilter) return false;
    if (!isDateInRange(inv.date, dateFilter)) return false;
    return true;
  });

  const handleSave = async () => {
    await loadData();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this invoice? Linked income/transactions will be removed.')) return;
    try {
      await deleteInvoice(id);
      toast.success('Invoice deleted');
      loadData();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete');
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto animate-fade-in space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Invoices</h1>
          <p className="text-slate-500 mt-1 text-base md:text-lg">Manage billing and payments.</p>
        </div>
        <button
          onClick={() => {
            setEditingInvoice(null);
            setNextInvoiceNumber(null);
            setIsFormOpen(true);
          }}
          className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2 shadow-lg shadow-brand-500/30"
        >
          <Plus size={20} /> New Invoice
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <StatCard
          title="Total Invoices"
          value={invoiceSummary != null ? String(invoiceSummary.totalInvoices ?? 0) : '—'}
          icon={FileText}
          color="bg-slate-600"
        />
        <StatCard
          title="Paid Invoices"
          value={invoiceSummary != null ? String(invoiceSummary.paidInvoices ?? 0) : '—'}
          icon={Receipt}
          color="bg-emerald-600"
        />
        <StatCard
          title="Pending / Overdue"
          value={invoiceSummary != null ? String((invoiceSummary.pendingInvoices ?? 0) + (invoiceSummary.overdueInvoices ?? 0)) : '—'}
          icon={AlertCircle}
          color="bg-amber-600"
        />
        <StatCard
          title="Total Revenue"
          value={invoiceSummary != null ? `₹${Number(invoiceSummary.totalRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
          icon={TrendingUp}
          color="bg-blue-600"
        />
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search invoice..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 w-full"
            />
          </div>
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="flex-1 lg:flex-none px-4 py-2 bg-white border border-gray-100 rounded-xl text-sm font-medium text-slate-600 outline-none focus:border-brand-500 min-w-[160px]"
          >
            <option value="">All Clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.company_name || c.client_name}>{c.company_name || c.client_name}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 lg:flex-none px-4 py-2 bg-white border border-gray-100 rounded-xl text-sm font-medium text-slate-600 outline-none focus:border-brand-500 min-w-[120px]"
          >
            <option value="All">All</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Overdue">Overdue</option>
          </select>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="flex-1 lg:flex-none px-4 py-2 bg-white border border-gray-100 rounded-xl text-sm font-medium text-slate-600 outline-none focus:border-brand-500 min-w-[120px]"
          >
            <option value="All">All Time</option>
            <option value="Today">Today</option>
            <option value="This Week">This Week</option>
            <option value="This Month">This Month</option>
            <option value="This Year">This Year</option>
          </select>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-4 md:px-6 md:py-5 border-b border-gray-100 flex flex-col lg:flex-row justify-between items-start lg:items-center bg-gray-50/50 gap-4">
          <h3 className="font-bold text-slate-800">Invoice History</h3>
          <span className="text-xs font-semibold text-slate-500 bg-gray-100 px-2 py-1 rounded-lg">
            Showing {filteredInvoices.length} of {invoices.length}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left min-w-[700px]">
            <thead className="bg-gray-50/50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Invoice ID</th>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Grand Total</th>
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
        </div>
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
  );
}
