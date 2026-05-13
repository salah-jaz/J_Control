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
    <div className="flex flex-col h-full bg-slate-50/50 animate-in fade-in duration-500 overflow-hidden">
      <div className="px-6 lg:px-8 pt-8 pb-6 bg-white border-b border-slate-200/60 shadow-sm relative z-10">
        <PageHeader
          title="Proposal Architecture"
          subtitle="Generate and track business proposals and price estimates"
          primaryAction={(
            <button onClick={() => { setEditId(null); setOpenForm(true); }} className="btn-primary flex items-center gap-2 shadow-lg shadow-indigo-500/20 group">
              <div className="bg-white/20 p-1 rounded-lg group-hover:bg-white/30 transition-colors">
                <Plus size={16} />
              </div>
              <span>Create New Proposal</span>
            </button>
          )}
          secondaryActions={(
            <button onClick={() => toast.error("Export not implemented")} className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 shadow-sm transition-all active:scale-95"><Download size={18} /></button>
          )}
        />

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8">
          <StatCard title="Total Volume" value={summary.total || 0} icon={FileSpreadsheet} colorClass="bg-slate-800" />
          <StatCard title="Drafts" value={summary.draft || 0} icon={Clock} colorClass="bg-amber-600" />
          <StatCard title="Sent" value={summary.sent || 0} icon={FileOutput} colorClass="bg-blue-600" />
          <StatCard title="Accepted" value={summary.accepted || 0} icon={CheckCircle2} colorClass="bg-emerald-600" />
          <StatCard title="Rejected" value={summary.rejected || 0} icon={Trash2} colorClass="bg-rose-600" />
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 bg-white">
        <div className="bg-slate-50/50 px-6 lg:px-8 py-3 border-b border-slate-100 flex flex-wrap items-center gap-3 sticky top-0 z-20">
          <div className="flex-1 min-w-[240px]">
            <div className="relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
              <input
                type="text"
                placeholder="Search by ID, client, or number..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm"
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
            <button onClick={() => setShowAdvancedFilters(!showAdvancedFilters)} className={clsx("p-2.5 border rounded-xl transition-all shadow-sm", showAdvancedFilters ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "bg-white border-slate-200 text-slate-600")}><Filter size={18} /></button>
            {(searchQuery || statusFilter !== "All" || clientFilter || dateFrom || dateTo) && <ClearFiltersButton onClick={() => { setSearchQuery(""); setStatusFilter("All"); setClientFilter(""); setDateFrom(""); setDateTo(""); }} />}
          </div>
        </div>

        {showAdvancedFilters && (
          <div className="bg-white px-6 lg:px-8 py-6 border-b border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-2">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">Client Classification</label>
              <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[13px] font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all" value={clientFilter} onChange={e => setClientFilter(e.target.value)}>
                <option value="">All Registered Clients</option>
                {safeClients.map(c => <option key={c.id} value={c.id}>{c.company_name || c.client_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">Temporal Range</label>
              <div className="flex items-center gap-2">
                <input type="date" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[13px] font-bold text-slate-700" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                <span className="text-slate-300 font-black">ΓÇö</span>
                <input type="date" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[13px] font-bold text-slate-700" value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto custom-scrollbar">
          <div className="min-w-full">
            <table className="w-full text-left border-collapse table-fixed">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 sticky top-0 z-10">
                  <th className="px-6 lg:px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-32">Quote No</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Engagement Target</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right w-40">Valuation</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-32">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-40">Timeline</th>
                  <th className="px-6 lg:px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right w-44">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {quotationsLoading ? (
                  <tr><td colSpan="6" className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse italic">Synchronizing Proposal Engine...</td></tr>
                ) : quotations.map(item => (
                  <tr key={item.id} className="group hover:bg-slate-50/80 transition-all duration-200">
                    <td className="px-6 lg:px-8 py-5">
                      <span className="font-mono text-[13px] font-black text-slate-900 italic tracking-tight bg-slate-100 px-2 py-1 rounded-lg">
                        {item.quotation_no}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center text-[12px] font-black text-slate-600 shadow-inner">
                          {item.client?.company_name?.[0] || item.client?.client_name?.[0] || 'Q'}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[13px] font-black text-slate-900 truncate max-w-[200px]">{item.client?.company_name || item.client?.client_name || '—'}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.client?.email || 'N/A'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <span className="font-mono text-[15px] font-black text-indigo-600 italic">
                        Γé╣{parseFloat(item.total || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className={clsx(
                        "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.1em] border shadow-sm inline-flex items-center gap-1.5",
                        item.status === 'Accepted' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                        item.status === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-100' : 
                        item.status === 'Converted' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                        'bg-amber-50 text-amber-700 border-amber-100'
                      )}>
                        <div className={clsx("w-1 h-1 rounded-full", 
                          item.status === 'Accepted' ? 'bg-emerald-500' : 
                          item.status === 'Rejected' ? 'bg-rose-500' : 'bg-amber-500'
                        )}></div>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col leading-none">
                        <div className="flex items-center gap-1.5 text-[12px] font-black text-slate-700">
                          <CalendarIcon size={12} className="text-slate-300" />
                          {item.date?.split('T')[0]}
                        </div>
                        {item.expiry_date && (
                          <span className="text-[10px] text-rose-500 font-bold mt-1.5 flex items-center gap-1">
                             <Clock size={10} /> Exp: {item.expiry_date?.split('T')[0]}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 lg:px-8 py-5 text-right">
                      <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                        <ActionIconButton onClick={() => { setViewQuotation(item); setOpenView(true); }} title="Intelligence View" icon={Eye} tone="view" />
                        <ActionIconButton onClick={() => { setEditId(item.id); setOpenForm(true); }} title="Modify Structure" icon={Edit2} tone="edit" />
                        <ActionIconButton onClick={() => handleDelete(item.id)} title="Purge Record" icon={Trash2} tone="delete" />
                        {item.status !== "Converted" && (
                          <ActionIconButton onClick={() => handleConvertToInvoice(item)} title="Generate Invoice" icon={FileOutput} tone="convert" />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!quotationsLoading && quotations.length === 0 && (
              <div className="p-20">
                <EmptyState icon={FileText} title="Proposal Pipeline Empty" description="Your sales intelligence is ready. Initiate a new proposal to start tracking conversion." />
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border-t border-slate-100 px-6 lg:px-8 py-4 flex-shrink-0">
          {quotationsMeta && <TablePagination summary={`Indexed ${quotations.length} of ${quotationsMeta.total} Proposals`} onPrevious={() => setCurrentPage(p => Math.max(1, p - 1))} onNext={() => setCurrentPage(p => p + 1)} previousDisabled={quotationsMeta.current_page <= 1} nextDisabled={quotationsMeta.current_page >= quotationsMeta.last_page} />}
        </div>
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
    <label className="block text-[12px] font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
      {children} {required && <span className="text-rose-500 font-black">*</span>}
    </label>
  );

  const inputCls = "w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all";

    return (
        <SlideOver
            isOpen={isOpen}
            onClose={onClose}
            title={editId ? 'Architectural Proposal Update' : 'Initialize Business Proposal'}
            size="5xl"
            footer={(
                <div className="flex justify-between items-center w-full px-1">
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aggregate Value</span>
                            <span className="text-[20px] font-black text-indigo-600 font-mono italic leading-none mt-1">₹{total.toLocaleString()}</span>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-6 py-2.5 text-[13px] font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all">Discard Changes</button>
                        <button onClick={handleSubmit} disabled={isSaving} className="px-8 py-2.5 bg-indigo-600 text-white text-[13px] font-black rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all">
                            {isSaving && <Loader2 size={16} className="animate-spin" />}
                            {editId ? 'Commit Proposal Update' : 'Generate Document'}
                        </button>
                    </div>
                </div>
            )}
        >
            <div className="flex h-full min-h-[600px] relative">
                {/* Sidebar Navigation */}
                <div className="w-64 border-r-2 border-slate-100 pr-6 shrink-0 hidden md:block">
                    <div className="flex flex-col gap-2 sticky top-0">
                        {[
                            { id: 'basic', label: 'Core Parameters', icon: Target },
                            { id: 'items', label: 'Catalog Items', icon: Layers },
                            { id: 'internal', label: 'Administrative', icon: Briefcase }
                        ].map((tabInfo, idx) => (
                            <div key={tabInfo.id}>
                                <button
                                    onClick={() => setTab(tabInfo.id)}
                                    className={clsx(
                                        "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-[0.15em] transition-all relative group",
                                        tab === tabInfo.id
                                            ? "bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100 ring-1 ring-indigo-200/50"
                                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                    )}
                                >
                                    {tab === tabInfo.id && (
                                        <div className="absolute -right-[26px] top-3 bottom-3 w-1 bg-indigo-600 rounded-l-full z-10" />
                                    )}
                                    <tabInfo.icon className={clsx("h-4 w-4", tab === tabInfo.id ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600")} />
                                    <span>{tabInfo.label}</span>
                                </button>
                                {idx < 2 && <div className="h-px bg-slate-50 mx-4 my-1 opacity-50" />}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 pl-10">
                    <div className="pb-20">
                        {tab === 'basic' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="col-span-2">
                                        <Label required>Client Engagement Target</Label>
                                        <select className={inputCls} value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}>
                                            <option value="">Search Registered Client Registry...</option>
                                            {clients.map(c => <option key={c.id} value={c.id}>{c.company_name || c.client_name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <Label required>Proposal Generation Date</Label>
                                        <input type="date" className={inputCls} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                                    </div>
                                    <div>
                                        <Label>Valuation Expiry Threshold</Label>
                                        <input type="date" className={inputCls} value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })} />
                                    </div>
                                    <div>
                                        <Label>Assigned Sales Architect</Label>
                                        <input className={inputCls} placeholder="Agent name..." value={form.sales_person} onChange={e => setForm({ ...form, sales_person: e.target.value })} />
                                    </div>
                                    <div>
                                        <Label>Administrative Reference</Label>
                                        <input className={inputCls} placeholder="EXT-REF-001..." value={form.reference_number} onChange={e => setForm({ ...form, reference_number: e.target.value })} />
                                    </div>
                                </div>
                                <div className="pt-4">
                                    <Label>Public Communication / Engagement Scope</Label>
                                    <textarea className={clsx(inputCls, "min-h-[160px] resize-none leading-relaxed")} placeholder="Specify the project scope or terms visible to the client..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                                </div>
                            </div>
                        )}

                        {tab === 'items' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                                    <div className="flex flex-col">
                                        <h4 className="text-[14px] font-black text-slate-900 uppercase tracking-widest">Catalog Item Selection</h4>
                                        <p className="text-[11px] font-bold text-slate-400 uppercase mt-1">Populate the proposal with organizational offerings</p>
                                    </div>
                                    <button onClick={() => setForm({ ...form, items: [...form.items, { item: "", description: "", qty: 1, price: "", tax: 0, amount: 0 }] })} className="px-5 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl text-[12px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm flex items-center gap-2 border border-indigo-100 group">
                                        <Plus size={16} className="group-hover:rotate-90 transition-transform" />
                                        <span>Add Offering</span>
                                    </button>
                                </div>
                                <div className="space-y-6">
                                    {form.items.map((row, idx) => (
                                        <div key={idx} className="bg-slate-50/50 border border-slate-200 rounded-2xl p-6 space-y-6 relative group shadow-sm hover:border-indigo-200 transition-colors">
                                            <div className="grid grid-cols-12 gap-6">
                                                <div className="col-span-8">
                                                    <Label>Offering Selection</Label>
                                                    <SearchableSelect options={products} value={row.item} onChange={v => updateItem(idx, 'item', v)} placeholder="Search catalog items..." />
                                                </div>
                                                <div className="col-span-4">
                                                    <Label>Standard Rate (₹)</Label>
                                                    <input type="number" className={clsx(inputCls, "font-black italic")} value={row.price} onChange={e => updateItem(idx, 'price', e.target.value)} />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-12 gap-6">
                                                <div className="col-span-9">
                                                    <Label>Scope Specification</Label>
                                                    <textarea className={clsx(inputCls, "min-h-[100px] text-[12px] resize-none leading-relaxed italic")} value={row.description} onChange={e => updateItem(idx, 'description', e.target.value)} />
                                                </div>
                                                <div className="col-span-3">
                                                    <Label>Tax Component %</Label>
                                                    <input type="number" className={inputCls} value={row.tax} onChange={e => updateItem(idx, 'tax', e.target.value)} />
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center pt-4 border-t border-slate-200/60">
                                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Calculated Row Valuation</span>
                                                <span className="font-mono text-[18px] font-black text-slate-900 italic">₹{row.amount.toLocaleString()}</span>
                                            </div>
                                            <button onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) })} className="absolute -top-3 -right-3 h-10 w-10 bg-white text-rose-500 rounded-xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 shadow-xl border border-slate-100">
                                                <Trash2 size={16}/>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                
                                <div className="bg-slate-900 rounded-3xl p-10 text-white space-y-6 shadow-2xl border border-slate-800 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 blur-[100px] rounded-full -mr-32 -mt-32" />
                                    <div className="flex justify-between text-[14px] font-bold text-slate-400 relative z-10">
                                        <span>SUBTOTAL</span>
                                        <span className="font-mono text-white italic text-[18px]">₹{subtotal.toLocaleString()}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-10 py-8 border-y border-slate-800/50 relative z-10">
                                        <div>
                                            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3 block">ADJUSTMENT DISCOUNT</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-black italic">₹</span>
                                                <input type="number" className="w-full bg-slate-800/40 border border-slate-700 rounded-2xl text-white text-[18px] font-black p-4 pl-10 outline-none focus:border-indigo-500 transition-all italic" value={form.discount} onChange={e => setForm({ ...form, discount: e.target.value })} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3 block">SUPPLEMENTARY TAX</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-black italic">₹</span>
                                                <input type="number" className="w-full bg-slate-800/40 border border-slate-700 rounded-2xl text-white text-[18px] font-black p-4 pl-10 outline-none focus:border-indigo-500 transition-all italic" value={form.tax} onChange={e => setForm({ ...form, tax: e.target.value })} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center pt-4 relative z-10">
                                        <div className="flex flex-col">
                                            <span className="text-[12px] font-black text-indigo-400 uppercase tracking-[0.2em]">Aggregate Proposal Value</span>
                                            <span className="text-[36px] font-black text-white font-mono italic leading-none mt-2">₹{total.toLocaleString()}</span>
                                        </div>
                                        <div className="h-16 w-16 rounded-3xl border-4 border-indigo-500/20 flex items-center justify-center">
                                            <div className="h-4 w-4 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_20px_rgba(99,102,241,0.5)]"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {tab === 'internal' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div>
                                    <Label>Administrative Context / Internal Logic</Label>
                                    <textarea className={clsx(inputCls, "min-h-[200px] resize-none leading-relaxed")} placeholder="Confidential internal notes regarding this proposal..." value={form.internal_notes} onChange={e => setForm({ ...form, internal_notes: e.target.value })} />
                                </div>
                                <div className="pt-4">
                                    <Label>Minimum Required Mobilization Deposit</Label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black italic">₹</span>
                                        <input type="number" className={clsx(inputCls, "pl-12 font-black italic text-[16px]")} placeholder="0.00" value={form.initial_deposit} onChange={e => setForm({ ...form, initial_deposit: e.target.value })} />
                                    </div>
                                    <p className="text-[12px] text-slate-400 mt-3 font-medium italic">This value defines the minimum upfront commitment requested from the client.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </SlideOver>
    );
};
