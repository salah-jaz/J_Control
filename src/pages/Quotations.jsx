import { useState, useEffect, useMemo, Suspense, lazy } from "react";
import {
  FileText,
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  FileOutput,
  X,
  User,
  Layers,
  Loader2,
  Filter,
  Building2,
  Calendar as CalendarIcon,
  Clock,
  Target,
  MessageSquare,
  Save,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import toast from "react-hot-toast";
import clsx from "clsx";
import { useQueryClient } from "@tanstack/react-query";
import { createQuotation, updateQuotation, deleteQuotation, convertQuotationToInvoice } from "../services/quotationService";
import { useQuotationList, useQuotationSummary, useClients } from "../hooks/useApiQueries";
import { invalidateCache } from "../utils/apiFetch";
import { queryKeys } from "../query/queryKeys";
import { TableSkeleton } from "../components/Skeleton";

const QuotationView = lazy(() => import("../components/QuotationView"));
const AgreementTab = lazy(() => import("../components/AgreementTab"));

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

function Quotations() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [tab, setTab] = useState("basic");
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

  const summaryFilters = useMemo(() => {
    const { page, per_page, ...rest } = filters;
    return rest;
  }, [filters]);

  const { data: summaryResult } = useQuotationSummary(summaryFilters);
  const { data: clientsResult } = useClients({ per_page: 100 });

  const quotations = Array.isArray(quotationsResult?.data) ? quotationsResult.data : [];
  const quotationsMeta = quotationsResult?.meta ?? null;
  const summary = summaryResult && typeof summaryResult === "object" ? summaryResult : {};
  const safeClients = Array.isArray(clientsResult?.data) ? clientsResult.data : [];

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchDebounced, statusFilter, clientFilter, dateFrom, dateTo]);

  const loadData = () => {
    invalidateCache("/quotations");
    queryClient.invalidateQueries({ queryKey: queryKeys.quotations.all });
  };


  const subtotalForm = (form.items || []).reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const discountForm = parseFloat(form.discount) || 0;
  const taxForm = parseFloat(form.tax) || 0;
  const totalForm = Math.max(0, subtotalForm - discountForm + taxForm);
  const initialDepositForm = parseFloat(form.initial_deposit) || 0;
  const balanceDueForm = Math.max(0, totalForm - initialDepositForm);

  const openAdd = () => {
    setForm({
      ...emptyForm,
      date: new Date().toISOString().split("T")[0],
      items: [{ item: "", description: "", qty: 1, price: "", tax: 0, amount: 0 }],
    });
    setErrors({});
    setEditId(null);
    setTab("basic");
    setIsSaving(false);
    setOpenForm(true);
  };

  const openEdit = (q) => {
    setIsSaving(false);
    const items = (q.items || []).map((i) => ({
      item: i.item || "",
      description: i.description || "",
      qty: parseFloat(i.qty) || 1,
      price: i.price != null ? i.price : "",
      tax: parseFloat(i.tax) || 0,
      amount: parseFloat(i.amount) || 0,
    }));
    if (items.length === 0) items.push({ item: "", description: "", qty: 1, price: "", tax: 0, amount: 0 });
    setForm({
      client_id: q.client_id || "",
      quotation_no: q.quotation_no || "",
      date: q.date ? (typeof q.date === "string" ? q.date.split("T")[0] : q.date) : "",
      expiry_date: q.expiry_date ? (typeof q.expiry_date === "string" ? q.expiry_date.split("T")[0] : q.expiry_date) : "",
      reference_number: q.reference_number || "",
      sales_person: q.sales_person || "",
      status: q.status || "Draft",
      notes: q.notes || "",
      internal_notes: q.internal_notes || "",
      subtotal: parseFloat(q.subtotal) || 0,
      discount: parseFloat(q.discount) || 0,
      tax: parseFloat(q.tax) || 0,
      total: parseFloat(q.total) || 0,
      initial_deposit: q.initial_deposit != null ? q.initial_deposit : "",
      items,
      agreement_content: q.agreement?.content ? (Array.isArray(q.agreement.content) ? q.agreement.content : []) : [],
    });
    setErrors({});
    setEditId(q.id);
    setTab("basic");
    setOpenForm(true);
  };

  const openViewModal = (q) => {
    setViewQuotation(q);
    setOpenView(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this quotation?")) return;
    try {
      await deleteQuotation(id);
      toast.success("Quotation deleted");
      loadData();
      if (viewQuotation?.id === id) {
        setOpenView(false);
        setViewQuotation(null);
      }
    } catch (e) {
      toast.error("Failed to delete quotation");
    }
  };

  const handleConvertToInvoice = async (q) => {
    try {
      await convertQuotationToInvoice(q.id);
      toast.success("Quotation converted to invoice");
      loadData();
      setOpenView(false);
      setViewQuotation(null);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to convert to invoice");
    }
  };

  const updateItem = (index, field, value) => {
    const next = [...(form.items || [])];
    if (!next[index]) return;
    next[index] = { ...next[index], [field]: value };
    if (field === "qty" || field === "price" || field === "tax") {
      const qty = parseFloat(next[index].qty) || 0;
      const price = parseFloat(next[index].price) || 0;
      const taxPct = field === "tax" ? parseFloat(value) || 0 : (parseFloat(next[index].tax) || 0);
      next[index].amount = Math.round((qty * price * (1 + taxPct / 100)) * 100) / 100;
    }
    setForm({ ...form, items: next });
  };

  const addItem = () => {
    setForm({
      ...form,
      items: [...(form.items || []), { item: "", description: "", qty: 1, price: "", tax: 0, amount: 0 }],
    });
  };

  const removeItem = (index) => {
    const next = (form.items || []).filter((_, i) => i !== index);
    if (next.length === 0) next.push({ item: "", description: "", qty: 1, price: "", tax: 0, amount: 0 });
    setForm({ ...form, items: next });
  };

  const validate = () => {
    const e = {};
    if (!form.client_id) e.client_id = "Client is required";
    if (!form.date) e.date = "Quotation date is required";
    if ((form.items || []).some((i) => !i.item || (parseFloat(i.price) === 0 && !i.amount))) {
      e.items = "Each item must have a name and price/amount";
    }
    setErrors(e);
    if (Object.keys(e).length > 0) {
      toast.error(Object.values(e)[0]);
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (isSaving) return;
    if (!validate()) return;
    setIsSaving(true);
    const payload = {
      client_id: form.client_id,
      quotation_no: form.quotation_no || undefined,
      date: form.date,
      expiry_date: form.expiry_date || null,
      reference_number: form.reference_number || null,
      sales_person: form.sales_person || null,
      status: form.status,
      notes: form.notes || null,
      internal_notes: form.internal_notes || null,
      subtotal: subtotalForm,
      discount: discountForm,
      tax: taxForm,
      total: totalForm,
      initial_deposit: form.initial_deposit ? initialDepositForm : null,
      items: (form.items || []).map((i) => ({
        item: i.item,
        description: i.description || null,
        qty: parseFloat(i.qty) || 1,
        price: parseFloat(i.price) || 0,
        tax: parseFloat(i.tax) || 0,
        amount: parseFloat(i.amount) || 0,
      })),
      agreement_content: form.agreement_content,
    };
    try {
      if (editId) {
        await updateQuotation(editId, payload);
        toast.success("Quotation updated");
      } else {
        await createQuotation(payload);
        toast.success("Quotation created");
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations.all });
      await queryClient.refetchQueries({ queryKey: queryKeys.quotations.all });
      loadData();
      setOpenForm(false);
    } catch (err) {
      setIsSaving(false);
      toast.error(err.response?.data?.message || "Failed to save quotation");
    }
  };

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
            <p className="text-[11px] text-slate-400 font-medium tracking-tight">Sales pipeline metrics</p>
        </div>
    </div>
  );

  const inputClass = (f) => `input ${errors[f] ? "border-red-500 focus:border-red-500 focus:ring-red-200" : ""}`;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header Background Strip */}
      <div className="absolute top-0 left-0 right-0 h-80 bg-gradient-to-b from-brand-50/50 to-transparent pointer-events-none" />

      <div className="relative p-6 md:p-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-brand-600 to-brand-400 rounded-xl shadow-[0_4px_12px_rgba(124,58,237,0.3)] relative group overflow-hidden">
                <FileOutput className="h-5 w-5 text-white relative z-10" />
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              </div>
              <h1 className="text-[28px] font-bold text-slate-900">Quotations</h1>
            </div>
            <p className="text-slate-500 font-medium text-[14px]">Create and manage quotations for your customers.</p>
          </div>
          <button
            onClick={openAdd}
            className="btn-primary group relative flex items-center gap-2 overflow-hidden shadow-[0_8px_20px_rgba(124,58,237,0.25)]"
          >
            {/* Shimmer Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer transition-none" />
            
            <Plus size={20} className="relative z-10" />
            <span className="relative z-10">New Quotation</span>
          </button>
        </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6">
        <StatCard title="Total" value={summary.total ?? 0} icon={FileText} color="bg-slate-500" />
        <StatCard title="Draft" value={summary.draft ?? 0} icon={FileText} color="bg-amber-500" />
        <StatCard title="Sent" value={summary.sent ?? 0} icon={FileText} color="bg-blue-500" />
        <StatCard title="Accepted" value={summary.accepted ?? 0} icon={FileText} color="bg-emerald-500" />
        <StatCard title="Rejected" value={summary.rejected ?? 0} icon={FileText} color="bg-rose-500" />
      </div>

      {/* Filters Bar */}
      <div className="space-y-3">
        <div className="bg-white/70 backdrop-blur-xl px-4 py-3 rounded-lg border border-slate-100 shadow-xl shadow-slate-200/20 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[240px] relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition-colors w-4 h-4" />
            <input
              type="text"
              placeholder="Search quotation number, client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-5 py-2 bg-slate-50 border border-slate-200/60 rounded-lg text-[13px] font-medium text-slate-700 shadow-inner placeholder:text-slate-400 focus:bg-white focus:border-brand-400 focus:ring-[3px] focus:ring-brand-500/15 transition-all duration-[250ms] outline-none hover:border-slate-300 h-10"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3.5 bg-white rounded-lg border border-slate-200 hover:border-brand-300 transition-all cursor-pointer group shadow-sm h-10">
              <Layers className="h-3.5 w-3.5 text-slate-500 group-hover:text-brand-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-[13px] py-1.5 font-medium text-slate-700 outline-none cursor-pointer"
              >
                <option value="All">All Status</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
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

            {(searchQuery || statusFilter !== "All" || clientFilter || dateFrom || dateTo) && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("All");
                  setClientFilter("");
                  setDateFrom("");
                  setDateTo("");
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
                {safeClients.map((c, idx) => (
                  <option key={c?.id ?? `client-${idx}`} value={c?.id ?? ""}>
                    {c?.company_name || c?.client_name || "—"}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-2">Period:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[13px] font-medium text-slate-600 outline-none focus:border-brand-400 h-10 shadow-sm"
              />
              <span className="text-slate-400 text-xs font-bold px-1">ΓÇô</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[13px] font-medium text-slate-600 outline-none focus:border-brand-400 h-10 shadow-sm"
              />
            </div>
          </div>
        )}
      </div>


      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-4 md:px-6 md:py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="font-bold text-slate-800">Quotation List</h3>
          <span className="text-xs font-semibold text-slate-500 bg-gray-100 px-2 py-1 rounded-lg">
            {quotationsLoading ? "Loading..." : quotationsMeta ? `Showing ${(quotationsMeta.current_page - 1) * quotationsMeta.per_page + 1}–${Math.min(quotationsMeta.current_page * quotationsMeta.per_page, quotationsMeta.total)} of ${quotationsMeta.total}` : `Showing ${quotations.length}`}
          </span>
        </div>
        <div className="overflow-x-auto">
          {quotationsLoading ? (
            <TableSkeleton rows={6} cols={7} />
          ) : (
          <table className="w-full text-sm text-left min-w-[800px]">
            <thead className="bg-gray-50/50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Quotation #</th>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Expiry Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {quotations.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-500 italic">No quotations found</td>
                </tr>
              ) : (
                quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 font-mono font-semibold text-slate-800">{q.quotation_no}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {q.client ? (q.client.company_name || q.client.client_name) : "—"}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {q.date ? (typeof q.date === "string" ? q.date.split("T")[0] : q.date) : "—"}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900">
                      ₹{parseFloat(q.total || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={clsx(
                          "px-2.5 py-1 rounded-lg text-xs font-semibold border",
                          q.status === "Draft" && "bg-gray-100 text-gray-700 border-gray-200",
                          q.status === "Sent" && "bg-blue-50 text-blue-700 border-blue-100",
                          q.status === "Accepted" && "bg-emerald-50 text-emerald-700 border-emerald-100",
                          q.status === "Rejected" && "bg-rose-50 text-rose-700 border-rose-100",
                          q.status === "Converted" && "bg-violet-50 text-violet-700 border-violet-100"
                        )}
                      >
                        {q.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {q.expiry_date ? (typeof q.expiry_date === "string" ? q.expiry_date.split("T")[0] : q.expiry_date) : "—"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1 transition-opacity">
                        <button
                          onClick={() => openViewModal(q)}
                          title="View"
                          className="p-2 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => openEdit(q)}
                          title="Edit"
                          className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(q.id)}
                          title="Delete"
                          className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                        {q.status !== "Converted" && (
                          <button
                            onClick={() => handleConvertToInvoice(q)}
                            title="Convert to Invoice"
                            className="p-2 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                          >
                            <FileOutput size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          )}
        </div>
        {quotationsMeta && quotationsMeta.last_page > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
            <span className="text-sm text-slate-600">
              Showing {(quotationsMeta.current_page - 1) * quotationsMeta.per_page + 1}–{Math.min(quotationsMeta.current_page * quotationsMeta.per_page, quotationsMeta.total)} of {quotationsMeta.total}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={quotationsMeta.current_page <= 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-slate-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={quotationsMeta.current_page >= quotationsMeta.last_page}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-slate-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {openForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-[4px] animate-in fade-in duration-[250ms]">
          <div className="bg-white/90 backdrop-blur-xl w-full max-w-6xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-[0.98] duration-[250ms] border border-white/40 overflow-hidden">
            
            {/* Header */}
            <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-white z-20">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white rounded-xl flex items-center justify-center shadow-[0_4px_12px_rgba(124,58,237,0.3)] animate-pulse-subtle">
                  <FileText className="h-5 w-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-[20px] font-bold text-slate-900 tracking-tight">
                    {editId ? "Edit Quotation Details" : "New Quotation"}
                  </h3>
                  <p className="text-[12px] font-medium text-slate-500 mt-0.5">
                    {editId ? `Editing ${form.quotation_no || "Quotation"}` : "Fill in the details for the new quotation"}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setOpenForm(false)} 
                className="h-10 w-10 bg-slate-50 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all flex items-center justify-center active:scale-95 shadow-sm border border-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Sidebar Tabs */}
              <div className="w-64 bg-slate-50/50 border-r border-slate-100 p-4 flex flex-col gap-1.5 overflow-y-auto">
                {[
                  { id: "basic", label: "Quotation Information", icon: Building2, desc: "Client & Dates" },
                  { id: "items", label: "Services / Items", icon: Layers, desc: "Service Details" },
                  { id: "agreement", label: "Terms & Conditions", icon: FileText, desc: "Contract Terms" },
                ].map(({ id, label, icon: Icon, desc }) => (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    className={clsx(
                      "flex items-start gap-3.5 px-4 py-3.5 rounded-xl transition-all duration-[250ms] text-left group",
                      tab === id 
                        ? "bg-white text-violet-600 shadow-sm border border-slate-200/60 ring-1 ring-violet-100/50" 
                        : "text-slate-500 hover:bg-white hover:text-slate-900 border border-transparent"
                    )}
                  >
                    <div className={clsx(
                      "mt-0.5 p-2 rounded-lg transition-colors",
                      tab === id ? "bg-violet-50 text-violet-600" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600"
                    )}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <span className="block text-[14px] font-bold tracking-tight">{label}</span>
                      <span className="block text-[11px] font-medium opacity-70 mt-0.5 uppercase tracking-wider">{desc}</span>
                    </div>
                  </button>
                ))}

                <div className="mt-auto pt-6 px-1">
                  <div className="bg-gradient-to-br from-violet-600 to-fuchsia-500 rounded-2xl p-4 text-white shadow-lg shadow-violet-200/50 overflow-hidden relative group">
                    <div className="relative z-10">
                      <p className="text-[11px] font-bold text-violet-100 uppercase tracking-widest mb-1">Total Calculation</p>
                      <p className="text-[22px] font-black tracking-tight flex items-baseline gap-1.5">
                        <span className="text-[14px] font-bold opacity-80">₹</span>
                        {totalForm.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-opacity rotate-12">
                      <Target size={120} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 overflow-y-auto bg-white p-8 custom-scrollbar relative">
                <div className="max-w-4xl mx-auto">
                  {tab === "basic" && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-[350ms]">
                      <div className="flex flex-col gap-1.5 border-b border-slate-100 pb-4 mb-2">
                        <h4 className="text-[16px] font-bold text-slate-900 flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-violet-500" />
                          Client & Timeline
                        </h4>
                        <p className="text-[12px] font-medium text-slate-500 uppercase tracking-widest">Client & Date details</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div className="space-y-1.5">
                          <label className="text-[13px] font-bold text-slate-700 ml-0.5">Select Client <span className="text-rose-500 font-black ml-1">*</span></label>
                          <select
                            value={form.client_id}
                            onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                            className={clsx("input-premium appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%2364748b%22%20d%3D%22M2.22%204.47a.75.75%200%200%201%201.06%200L6%207.19l2.72-2.72a.75.75%200%201%201%201.06%201.06L6.53%208.81a.75.75%200%200%201-1.06%200L2.22%205.53a.75.75%200%200%201%200-1.06z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:14px_14px] bg-[right_1rem_center] bg-no-repeat", inputClass("client_id"))}
                          >
                            <option value="">Select Client</option>
                            {safeClients.map((c) => (
                              <option key={c.id} value={c.id}>{c.company_name || c.client_name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[13px] font-bold text-slate-700 ml-0.5">Quotation Number</label>
                          <input
                            type="text"
                            readOnly
                            className="input-premium bg-slate-50/80 text-slate-500 border-slate-200/60 font-mono text-[14px]"
                            value={editId ? form.quotation_no : "QT-YYYY-#### (AUTO)"}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[13px] font-bold text-slate-700 ml-0.5">Quotation Date <span className="text-rose-500 font-black ml-1">*</span></label>
                          <div className="relative">
                            <CalendarIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                              type="date"
                              value={form.date}
                              onChange={(e) => setForm({ ...form, date: e.target.value })}
                              className={clsx("input-premium pl-10", inputClass("date"))}
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[13px] font-bold text-slate-700 ml-0.5">Expiry Date</label>
                          <div className="relative">
                            <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                              type="date"
                              value={form.expiry_date}
                              onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                              className="input-premium pl-10"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[13px] font-bold text-slate-700 ml-0.5">Reference Number</label>
                          <input
                            type="text"
                            value={form.reference_number}
                            onChange={(e) => setForm({ ...form, reference_number: e.target.value })}
                            className="input-premium placeholder:text-slate-300"
                            placeholder="Reference Number..."
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[13px] font-bold text-slate-700 ml-0.5">Sales Person</label>
                          <div className="relative">
                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                              type="text"
                              value={form.sales_person}
                              onChange={(e) => setForm({ ...form, sales_person: e.target.value })}
                              className="input-premium pl-10 placeholder:text-slate-300"
                              placeholder="Enter Sales Person Name"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[13px] font-bold text-slate-700 ml-0.5">Status</label>
                        <select
                            value={form.status}
                            onChange={(e) => setForm({ ...form, status: e.target.value })}
                            className="input-premium appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%2364748b%22%20d%3D%22M2.22%204.47a.75.75%200%200%201%201.06%200L6%207.19l2.72-2.72a.75.75%200%201%201%201.06%201.06L6.53%208.81a.75.75%200%200%201-1.06%200L2.22%205.53a.75.75%200%200%201%200-1.06z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:14px_14px] bg-[right_1rem_center] bg-no-repeat"
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                        <div className="space-y-1.5">
                          <label className="text-[13px] font-bold text-slate-700 ml-0.5 flex items-center gap-1.5">
                            <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
                            Client Notes
                          </label>
                          <textarea
                            value={form.notes}
                            onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            className="input-premium min-h-[120px] pt-3 text-[14px] placeholder:text-slate-300"
                            placeholder="Add notes visible to the client..."
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[13px] font-bold text-slate-700 ml-0.5 flex items-center gap-1.5">
                            <Target className="h-3.5 w-3.5 text-slate-400" />
                            Internal Notes
                          </label>
                          <textarea
                            value={form.internal_notes}
                            onChange={(e) => setForm({ ...form, internal_notes: e.target.value })}
                            className="input-premium min-h-[120px] pt-3 text-[14px] bg-slate-50/30 placeholder:text-slate-300"
                            placeholder="Internal notes (not visible to client)..."
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {tab === "items" && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-[350ms]">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-2">
                        <div className="flex flex-col gap-1.5">
                          <h4 className="text-[16px] font-bold text-slate-900 flex items-center gap-2">
                            <Layers className="h-4 w-4 text-violet-500" />
                            Service Items
                          </h4>
                          <p className="text-[12px] font-medium text-slate-500 uppercase tracking-widest">Detail service items & pricing</p>
                        </div>
                        <button 
                          type="button" 
                          onClick={addItem} 
                          className="px-4 py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-[13px] font-bold hover:bg-white hover:text-violet-600 hover:border-violet-200 transition-all flex items-center gap-2 active:scale-95 group shadow-sm"
                        >
                          <Plus className="h-3.5 w-3.5 stroke-[2.5] group-hover:scale-110 transition-transform" />
                          Add Item
                        </button>
                      </div>

                      <div className="bg-slate-50/30 rounded-2xl border border-slate-100 overflow-hidden">
                        <table className="w-full text-sm text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-[11px] font-black text-slate-500 uppercase tracking-[0.1em] border-b border-slate-100">
                              <th className="px-5 py-4 w-[25%]">Service Name</th>
                              <th className="px-5 py-4 w-[25%]">Description</th>
                              <th className="px-5 py-4 w-[12%] text-center">Quantity</th>
                              <th className="px-5 py-4 w-[15%]">Rate (₹)</th>
                              <th className="px-5 py-4 w-[10%] text-center">Tax %</th>
                              <th className="px-5 py-4 w-[13%] text-right bg-slate-100/30 font-bold">Total</th>
                              <th className="px-5 py-4 w-[5%]"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {(form.items || []).map((row, index) => (
                              <tr key={index} className="group hover:bg-slate-50/50 transition-colors">
                                <td className="px-4 py-3 align-top">
                                  <input
                                    type="text"
                                    value={row.item}
                                    onChange={(e) => updateItem(index, "item", e.target.value)}
                                    className="w-full bg-transparent border-0 border-b border-transparent focus:border-violet-500 focus:ring-0 text-[14px] font-bold text-slate-800 placeholder:font-normal placeholder:text-slate-300 transition-all"
                                    placeholder="Service Name..."
                                  />
                                </td>
                                <td className="px-4 py-3 align-top">
                                  <textarea
                                    value={row.description}
                                    onChange={(e) => updateItem(index, "description", e.target.value)}
                                    className="w-full bg-transparent border-0 border-b border-transparent focus:border-violet-500 focus:ring-0 text-[13px] text-slate-600 placeholder:text-slate-300 resize-none py-0 min-h-[24px]"
                                    placeholder="Enter description..."
                                    rows={1}
                                  />
                                </td>
                                <td className="px-4 py-3 text-center align-top">
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={row.qty === "" || row.qty == null ? "" : row.qty}
                                    onChange={(e) => updateItem(index, "qty", e.target.value)}
                                    className="w-full text-center bg-slate-50/50 border-slate-100 rounded-lg focus:ring-violet-500 focus:border-violet-500 text-[14px] font-black text-slate-800 p-1.5"
                                  />
                                </td>
                                <td className="px-4 py-3 align-top">
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={row.price}
                                    onChange={(e) => updateItem(index, "price", e.target.value)}
                                    className="w-full bg-slate-50/50 border-slate-100 rounded-lg focus:ring-violet-500 focus:border-violet-500 text-[14px] font-bold text-slate-800 p-1.5"
                                  />
                                </td>
                                <td className="px-4 py-3 text-center align-top">
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={row.tax}
                                    onChange={(e) => updateItem(index, "tax", e.target.value)}
                                    className="w-full text-center bg-slate-50/50 border-slate-100 rounded-lg focus:ring-violet-500 focus:border-violet-500 text-[13px] text-slate-600 p-1.5"
                                  />
                                </td>
                                <td className="px-5 py-4 text-right align-top bg-slate-50/30 border-l border-slate-100/50">
                                  <span className="text-[14px] font-black text-slate-900">₹{(parseFloat(row.amount) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                                </td>
                                <td className="px-4 py-3 text-center align-top">
                                  {(form.items || []).length > 1 && (
                                    <button 
                                      type="button" 
                                      onClick={() => removeItem(index)} 
                                      className="h-8 w-8 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex justify-end pt-4">
                        <div className="w-full max-w-sm bg-slate-50/80 rounded-2xl border border-slate-100 p-6 space-y-4 shadow-sm">
                          <div className="flex justify-between items-center pb-2 border-b border-slate-200/50">
                            <span className="text-[13px] font-bold text-slate-500 uppercase tracking-widest">Subtotal</span>
                            <span className="text-[16px] font-bold text-slate-900">₹{subtotalForm.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="flex items-center gap-4">
                              <label className="text-[12px] font-bold text-slate-600 flex-1 uppercase tracking-wider">Adjustment / Discount (₹)</label>
                              <input
                                type="number"
                                step="0.01"
                                className="w-32 bg-white border-slate-200 rounded-xl focus:ring-violet-500 focus:border-violet-500 text-[14px] font-bold text-slate-800 text-right p-2.5 shadow-inner"
                                placeholder="0.00"
                                value={form.discount}
                                onChange={(e) => setForm({ ...form, discount: e.target.value })}
                              />
                            </div>
                            <div className="flex items-center gap-4">
                              <label className="text-[12px] font-bold text-slate-600 flex-1 uppercase tracking-wider">Lump-sum Taxation (₹)</label>
                              <input
                                type="number"
                                step="0.01"
                                className="w-32 bg-white border-slate-200 rounded-xl focus:ring-violet-500 focus:border-violet-500 text-[14px] font-bold text-slate-800 text-right p-2.5 shadow-inner"
                                placeholder="0.00"
                                value={form.tax}
                                onChange={(e) => setForm({ ...form, tax: e.target.value })}
                              />
                            </div>
                          </div>

                          <div className="pt-4 border-t-2 border-slate-200 flex justify-between items-center">
                            <div className="flex flex-col">
                              <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Amount</span>
                              <span className="text-[12px] font-bold text-violet-600">(Grand Total)</span>
                            </div>
                            <span className="text-[24px] font-black tracking-tight text-slate-900">
                              <span className="text-[14px] font-bold opacity-60 mr-1.5 uppercase tracking-normal">INR</span>
                              {totalForm.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {tab === "agreement" && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-[350ms]">
                      <div className="flex flex-col gap-1.5 border-b border-slate-100 pb-4 mb-8">
                        <h4 className="text-[16px] font-bold text-slate-900 flex items-center gap-2">
                          <FileText className="h-4 w-4 text-violet-500" />
                          Compliance & Terms
                        </h4>
                        <p className="text-[12px] font-medium text-slate-500 uppercase tracking-widest">Define terms of service and conditions</p>
                      </div>

                      <div className="bg-white border-2 border-slate-100 rounded-2xl shadow-inner min-h-[400px]">
                        <Suspense fallback={
                          <div className="py-20 flex flex-col items-center justify-center gap-4">
                            <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
                            <p className="text-[13px] font-bold text-slate-400 uppercase tracking-widest">Protocol Initializing...</p>
                          </div>
                        }>
                          <AgreementTab
                            value={form.agreement_content || []}
                            onChange={(v) => setForm({ ...form, agreement_content: v })}
                          />
                        </Suspense>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Premium Footer */}
            <div className="px-8 py-5 border-t border-slate-100 flex justify-between items-center bg-slate-50/50 z-20">
              <div className="hidden md:flex items-center gap-6">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Total Amount</span>
                  <p className="text-[18px] font-black text-slate-900 tracking-tight leading-none">₹{totalForm.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="h-8 w-px bg-slate-200"></div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Status</span>
                  <span className={clsx(
                    "inline-flex items-center text-[11px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider",
                    form.status === 'Accepted' ? 'bg-emerald-100 text-emerald-700' : 
                    form.status === 'Rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                  )}>
                    {form.status}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 ml-auto w-full md:w-auto">
                <button 
                  type="button" 
                  onClick={() => setOpenForm(false)} 
                  className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-[14px] font-medium hover:border-slate-300 hover:bg-slate-50 transition-all duration-[250ms] shadow-sm active:scale-[0.98] flex-1 md:flex-none"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className={clsx(
                    "px-8 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white rounded-xl text-[14px] font-medium shadow-[0_8px_20px_rgba(124,58,237,0.25)] hover:shadow-[0_12px_24px_rgba(124,58,237,0.35)] transition-all duration-[250ms] hover:-translate-y-[2px] active:scale-[0.98] group flex items-center justify-center min-w-[180px] flex-1 md:flex-none",
                    isSaving && "opacity-60 grayscale cursor-not-allowed shadow-none hover:translate-y-0 active:scale-100"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Finalizing...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 stroke-[2.5]" />
                        Save Quotation
                      </>
                    )}
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {openView && (
        <Suspense fallback={<div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center"><div className="text-white">Loading...</div></div>}>
          <QuotationView
            isOpen={openView}
            onClose={() => { setOpenView(false); setViewQuotation(null); }}
            quotation={viewQuotation}
            onEdit={() => { setOpenView(false); if (viewQuotation) openEdit(viewQuotation); }}
            onDelete={() => viewQuotation && handleDelete(viewQuotation.id)}
            onConvertToInvoice={() => viewQuotation && handleConvertToInvoice(viewQuotation)}
            onSaved={() => loadData()}
          />
        </Suspense>
      )}
      </div>
    </div>
  );
}

export default Quotations;
