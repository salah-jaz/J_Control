import { useState, useEffect, useMemo, Suspense, lazy } from "react";
import {
  FileText, Plus, Eye, Edit2, Trash2, FileOutput, X, User, Layers, 
  Loader2, Filter, Building2, Calendar as CalendarIcon, Clock, Target, 
  MessageSquare, Save, ChevronRight, Download, Search, CheckCircle2,
  TrendingUp, FileSpreadsheet, Briefcase
} from "lucide-react";
import toast from "react-hot-toast";
import clsx from "clsx";
import { useQueryClient } from "@tanstack/react-query";
import { createQuotation, updateQuotation, deleteQuotation, convertQuotationToInvoice } from "../services/quotationService";
import { useQuotationList, useQuotationSummary, useClients, useProducts } from "../hooks/useApiQueries";
import { invalidateCache } from "../utils/apiFetch";
import { queryKeys } from "../query/queryKeys";
import PageHeader from "../components/ui/PageHeader";
import EmptyState from "../components/ui/EmptyState";
import { FilterSelect, ClearFiltersButton } from "../components/ui/FilterControls";
import { TableSectionHeader, TablePagination } from "../components/ui/DataTableSection";
import { ActionIconButton } from "../components/ui/TableRowActions";
import SearchableSelect from "../components/ui/SearchableSelect";
import SlideOver from "../components/ui/SlideOver";

const QuotationView = lazy(() => import("../components/QuotationView"));

const emptyForm = {
  client_id: "",
  quotation_no: "",
  date: new Date().toISOString().split("T")[0],
  expiry_date: "",
  reference_number: "",
  sales_person: "",
  status: "Draft",
  notes: "",
  internal_notes: "",
  subtotal: 0,
  discount: 0,
  tax: 0,
  total: 0,
  initial_deposit: "",
  items: [{ item: "", description: "", qty: 1, price: "", tax: 0, amount: 0 }],
  agreement_content: [],
};

const STATUS_OPTIONS = ["Draft", "Sent", "Accepted", "Rejected", "Converted"];

const StatCard = ({ title, value, icon: Icon, colorClass }) => (
  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
    <div className={clsx("w-10 h-10 rounded-lg flex items-center justify-center shadow-inner", colorClass)}>
      <Icon size={20} className="text-white" />
    </div>
    <div>
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{title}</p>
      <p className="text-[20px] font-bold text-slate-900 leading-none mt-1">{value}</p>
    </div>
  </div>
);

export default function Quotations() {
  const queryClient = useQueryClient();
  const [openForm, setOpenForm] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [editId, setEditId] = useState(null);
  const [viewQuotation, setViewQuotation] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [clientFilter, setClientFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const filters = useMemo(
    () => ({
      search: searchDebounced.trim() || undefined,
      status: statusFilter === "All" ? undefined : statusFilter,
      client_id: clientFilter || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      page: currentPage,
      per_page: 20,
    }),
    [searchDebounced, statusFilter, clientFilter, dateFrom, dateTo, currentPage]
  );

  const { data: quotationsResult, isLoading: quotationsLoading } = useQuotationList(filters);
  const { data: summaryResult } = useQuotationSummary(useMemo(() => {
    const { page, per_page, ...rest } = filters;
    return rest;
  }, [filters]));
  const { data: clientsResult } = useClients({ per_page: 100 });
  const { data: productsResult } = useProducts();

  const quotations = Array.isArray(quotationsResult?.data) ? quotationsResult.data : [];
  const quotationsMeta = quotationsResult?.meta ?? null;
  const summary = summaryResult && typeof summaryResult === "object" ? summaryResult : {};
  const safeClients = Array.isArray(clientsResult?.data) ? clientsResult.data : [];
  const safeProducts = Array.isArray(productsResult) ? productsResult : [];

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const loadData = () => {
    invalidateCache("/quotations");
    queryClient.invalidateQueries({ queryKey: queryKeys.quotations.all });
  };

  const handleSave = async (payload) => {
    try {
      if (editId) {
        await updateQuotation(editId, payload);
        toast.success("Quotation updated");
      } else {
        await createQuotation(payload);
        toast.success("Quotation generated");
      }
      loadData();
      setOpenForm(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to sync quotation");
      throw err;
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Purge this quotation?")) return;
    try {
      await deleteQuotation(id);
      toast.success("Quotation purged");
      loadData();
      if (viewQuotation?.id === id) setOpenView(false);
    } catch (e) {
      toast.error("Operation failed");
    }
  };

  const handleConvertToInvoice = async (q) => {
    try {
      await convertQuotationToInvoice(q.id);
      toast.success("Converted to Invoice");
      loadData();
      setOpenView(false);
    } catch (e) {
      toast.error(e.response?.data?.message || "Conversion failed");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 p-4 md:p-8">
      <PageHeader
        title="Quotation Management"
        subtitle="Generate and track business proposals and price estimates"
        primaryAction={(
          <button onClick={() => { setEditId(null); setOpenForm(true); }} className="btn-primary flex items-center gap-2 shadow-lg shadow-indigo-500/20">
            <Plus size={18} />
            <span>New Quotation</span>
          </button>
        )}
        secondaryActions={(
          <button onClick={() => toast.error("Export not implemented")} className="p-2 bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-50 shadow-sm"><Download size={18} /></button>
        )}
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard title="Total Volume" value={summary.total || 0} icon={FileSpreadsheet} colorClass="bg-slate-800" />
        <StatCard title="Drafts" value={summary.draft || 0} icon={Clock} colorClass="bg-amber-600" />
        <StatCard title="Sent" value={summary.sent || 0} icon={FileOutput} colorClass="bg-blue-600" />
        <StatCard title="Accepted" value={summary.accepted || 0} icon={CheckCircle2} colorClass="bg-emerald-600" />
        <StatCard title="Rejected" value={summary.rejected || 0} icon={Trash2} colorClass="bg-rose-600" />
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
          <FilterSelect icon={CheckCircle2} value={statusFilter} onChange={setStatusFilter}>
            <option value="All">All Status</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </FilterSelect>
          <button onClick={() => setShowAdvancedFilters(!showAdvancedFilters)} className={clsx("p-2 border rounded-lg transition-all shadow-sm", showAdvancedFilters ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "bg-white border-slate-200 text-slate-600")}><Filter size={18} /></button>
          {(searchQuery || statusFilter !== "All" || clientFilter || dateFrom || dateTo) && <ClearFiltersButton onClick={() => { setSearchQuery(""); setStatusFilter("All"); setClientFilter(""); setDateFrom(""); setDateTo(""); }} />}
        </div>
      </div>

      {showAdvancedFilters && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-2">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Client Filter</label>
            <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[13px] font-medium" value={clientFilter} onChange={e => setClientFilter(e.target.value)}>
              <option value="">All Clients</option>
              {safeClients.map(c => <option key={c.id} value={c.id}>{c.company_name || c.client_name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Date Range</label>
            <div className="flex items-center gap-2">
              <input type="date" className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[13px]" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              <span className="text-slate-300">-</span>
              <input type="date" className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[13px]" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <TableSectionHeader title="Quotation Pipeline" summary={`${quotationsMeta?.total || 0} proposals registered`} />
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Quote No</th>
                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Client</th>
                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">Valuation</th>
                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Timeline</th>
                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {quotationsLoading ? (
                <tr><td colSpan="6" className="p-12 text-center text-slate-400 font-medium">Synchronizing proposal data...</td></tr>
              ) : quotations.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="font-mono text-[13px] font-black text-slate-900 italic tracking-tight">{item.quotation_no}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center text-[11px] font-bold text-slate-500">{item.client?.company_name?.[0] || item.client?.client_name?.[0]}</div>
                      <span className="text-[13px] font-medium text-slate-700 truncate max-w-[180px]">{item.client?.company_name || item.client?.client_name || '—'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-mono text-[14px] font-black text-slate-900 italic">
                      ₹{parseFloat(item.total || 0).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={clsx(
                      "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider",
                      item.status === 'Accepted' ? 'bg-emerald-100 text-emerald-700' : 
                      item.status === 'Rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                    )}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col leading-none">
                      <span className="text-[12px] font-bold text-slate-800">{item.date?.split('T')[0]}</span>
                      {item.expiry_date && <span className="text-[10px] text-rose-500 font-medium mt-1">Exp: {item.expiry_date?.split('T')[0]}</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                      <ActionIconButton onClick={() => { setViewQuotation(item); setOpenView(true); }} title="View Detail" icon={Eye} tone="view" />
                      <ActionIconButton onClick={() => { setEditId(item.id); setOpenForm(true); }} title="Edit Proposal" icon={Edit2} tone="edit" />
                      <ActionIconButton onClick={() => handleDelete(item.id)} title="Purge Proposal" icon={Trash2} tone="delete" />
                      {item.status !== "Converted" && (
                        <ActionIconButton onClick={() => handleConvertToInvoice(item)} title="Convert to Invoice" icon={FileOutput} tone="convert" />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!quotationsLoading && quotations.length === 0 && (
                <tr><td colSpan="6" className="p-20"><EmptyState icon={FileText} title="No Proposals Found" description="Start by generating a new quotation to populate your sales pipeline." /></td></tr>
              )}
            </tbody>
          </table>
        </div>
        {quotationsMeta && <TablePagination summary={`Showing ${quotations.length} of ${quotationsMeta.total} entries`} onPrevious={() => setCurrentPage(p => Math.max(1, p - 1))} onNext={() => setCurrentPage(p => p + 1)} previousDisabled={quotationsMeta.current_page <= 1} nextDisabled={quotationsMeta.current_page >= quotationsMeta.last_page} />}
      </div>

      <QuotationForm
        isOpen={openForm}
        onClose={() => setOpenForm(false)}
        editId={editId}
        quotations={quotations}
        clients={safeClients}
        products={safeProducts}
        onSave={handleSave}
      />

      <Suspense fallback={null}>
        {openView && (
          <QuotationView
            isOpen={openView}
            onClose={() => { setOpenView(false); setViewQuotation(null); }}
            quotation={viewQuotation}
            onEdit={() => { setOpenView(false); setEditId(viewQuotation.id); setOpenForm(true); }}
            onDelete={() => viewQuotation && handleDelete(viewQuotation.id)}
            onConvertToInvoice={() => viewQuotation && handleConvertToInvoice(viewQuotation)}
            onSaved={() => loadData()}
          />
        )}
      </Suspense>
    </div>
  );
}

const QuotationForm = ({ isOpen, onClose, editId, quotations, clients, products, onSave }) => {
  const [form, setForm] = useState(emptyForm);
  const [tab, setTab] = useState("basic");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editId) {
      const q = quotations.find(x => x.id === editId);
      if (q) {
        setForm({
          ...emptyForm,
          ...q,
          date: q.date?.split('T')[0],
          expiry_date: q.expiry_date?.split('T')[0],
          items: q.items.map(i => ({ ...i, qty: parseFloat(i.qty), price: parseFloat(i.price), tax: parseFloat(i.tax), amount: parseFloat(i.amount) }))
        });
      }
    } else {
      setForm({ ...emptyForm, date: new Date().toISOString().split("T")[0] });
    }
    setTab("basic");
  }, [editId, isOpen, quotations]);

  const subtotal = (form.items || []).reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const discountVal = parseFloat(form.discount) || 0;
  const taxVal = parseFloat(form.tax) || 0;
  const total = Math.max(0, subtotal - discountVal + taxVal);

  const updateItem = (idx, field, val) => {
    const next = [...form.items];
    const item = { ...next[idx], [field]: val };
    
    if (field === "item") {
      const p = products.find(x => x.name === val);
      if (p) {
        item.description = p.description || "";
        item.price = parseFloat(p.price) || 0;
      }
    }
    
    if (field === "price" || field === "tax" || field === "item") {
      const p = parseFloat(item.price) || 0;
      const t = parseFloat(item.tax) || 0;
      item.amount = Math.round((p * (1 + t / 100)) * 100) / 100;
    }
    
    next[idx] = item;
    setForm({ ...form, items: next });
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      await onSave({ ...form, subtotal, total });
    } catch (e) {
      // toast handled in parent
    } finally {
      setIsSaving(false);
    }
  };

  const Label = ({ children, required }) => (
    <label className="block text-[12px] font-bold text-slate-700 mb-1">
      {children} {required && <span className="text-rose-500">*</span>}
    </label>
  );

  const inputCls = "w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-[13px] font-medium outline-none focus:border-indigo-500 transition-all";

  return (
    <SlideOver
      isOpen={isOpen}
      onClose={onClose}
      title={editId ? 'Modify Proposal' : 'Generate New Quotation'}
      size="xl"
      footer={(
        <div className="flex justify-between items-center w-full px-1">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Grand Total</span>
            <span className="text-[18px] font-black text-slate-900 leading-none">₹{total.toLocaleString()}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-[13px] font-bold text-slate-600 hover:bg-slate-100 rounded transition-colors">Discard</button>
            <button onClick={handleSubmit} disabled={isSaving} className="px-6 py-2 bg-indigo-600 text-white text-[13px] font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-500/20">
              {isSaving && <Loader2 size={16} className="animate-spin" />}
              {editId ? 'Update Proposal' : 'Commit Quotation'}
            </button>
          </div>
        </div>
      )}
    >
      <div className="flex bg-slate-50 p-1 rounded-md mb-6 sticky top-0 z-10 border border-slate-200">
        {['basic', 'items', 'internal'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={clsx("flex-1 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider transition-all", tab === t ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
            {t === 'items' ? 'Catalog Items' : t}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {tab === 'basic' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label required>Client</Label>
                <select className={inputCls} value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}>
                  <option value="">Select Target Client</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.company_name || c.client_name}</option>)}
                </select>
              </div>
              <div>
                <Label required>Proposal Date</Label>
                <input type="date" className={inputCls} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>
              <div>
                <Label>Validity End Date</Label>
                <input type="date" className={inputCls} value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })} />
              </div>
              <div>
                <Label>Sales Agent</Label>
                <input className={inputCls} value={form.sales_person} onChange={e => setForm({ ...form, sales_person: e.target.value })} />
              </div>
              <div>
                <Label>Reference No</Label>
                <input className={inputCls} value={form.reference_number} onChange={e => setForm({ ...form, reference_number: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Public Engagement Notes</Label>
              <textarea className={clsx(inputCls, "min-h-[80px] resize-none")} placeholder="Visible to client..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
        )}

        {tab === 'items' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Catalog Selection</h4>
              <button onClick={() => setForm({ ...form, items: [...form.items, { item: "", description: "", qty: 1, price: "", tax: 0, amount: 0 }] })} className="text-[12px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"><Plus size={14}/> Add Row</button>
            </div>
            <div className="space-y-3">
              {form.items.map((row, idx) => (
                <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 relative group shadow-sm">
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-8">
                      <Label>Offering Identification</Label>
                      <SearchableSelect options={products} value={row.item} onChange={v => updateItem(idx, 'item', v)} placeholder="Search catalog..." />
                    </div>
                    <div className="col-span-4">
                      <Label>Standard Rate (₹)</Label>
                      <input type="number" className={clsx(inputCls, "font-bold")} value={row.price} onChange={e => updateItem(idx, 'price', e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-10">
                      <Label>Scope / Specification</Label>
                      <textarea className={clsx(inputCls, "min-h-[60px] text-[12px] resize-none")} value={row.description} onChange={e => updateItem(idx, 'description', e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <Label>Tax %</Label>
                      <input type="number" className={inputCls} value={row.tax} onChange={e => updateItem(idx, 'tax', e.target.value)} />
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                    <span className="text-[11px] font-bold text-slate-400">Total Row Value</span>
                    <span className="font-mono text-[14px] font-black text-slate-900 italic">₹{row.amount.toLocaleString()}</span>
                  </div>
                  <button onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) })} className="absolute -top-2 -right-2 h-6 w-6 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center hover:bg-rose-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100 shadow-sm"><Trash2 size={12}/></button>
                </div>
              ))}
            </div>
            <div className="bg-slate-900 rounded-xl p-4 text-white space-y-2">
              <div className="flex justify-between text-[12px]"><span>Subtotal</span><span className="font-mono">₹{subtotal.toLocaleString()}</span></div>
              <div className="flex items-center gap-4 py-2 border-y border-slate-800">
                <div className="flex-1">
                  <Label>Lump-sum Discount</Label>
                  <input type="number" className="w-full bg-slate-800 border-none rounded text-white text-[13px] font-bold p-1.5" value={form.discount} onChange={e => setForm({ ...form, discount: e.target.value })} />
                </div>
                <div className="flex-1">
                  <Label>Adjustment Tax</Label>
                  <input type="number" className="w-full bg-slate-800 border-none rounded text-white text-[13px] font-bold p-1.5" value={form.tax} onChange={e => setForm({ ...form, tax: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-between text-[16px] font-black pt-1"><span>Proposal Total</span><span className="text-indigo-400">₹{total.toLocaleString()}</span></div>
            </div>
          </div>
        )}

        {tab === 'internal' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <Label>Administrative Context / Internal Notes</Label>
              <textarea className={clsx(inputCls, "min-h-[120px]")} placeholder="Private notes for staff..." value={form.internal_notes} onChange={e => setForm({ ...form, internal_notes: e.target.value })} />
            </div>
            <div>
              <Label>Initial Deposit Requirement</Label>
              <input type="number" className={inputCls} placeholder="Advance required (₹)" value={form.initial_deposit} onChange={e => setForm({ ...form, initial_deposit: e.target.value })} />
            </div>
          </div>
        )}
      </div>
    </SlideOver>
  );
};
