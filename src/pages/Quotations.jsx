import { useState, useEffect } from "react";
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
} from "lucide-react";
import toast from "react-hot-toast";
import clsx from "clsx";
import { getQuotations, createQuotation, updateQuotation, deleteQuotation, convertQuotationToInvoice } from "../services/quotationService";
import { getClients } from "../services/db";
import QuotationView from "../components/QuotationView";
import AgreementTab from "../components/AgreementTab";

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
  const [listData, setListData] = useState({ quotations: [], summary: null });
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [tab, setTab] = useState("basic");
  const [openForm, setOpenForm] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [editId, setEditId] = useState(null);
  const [viewQuotation, setViewQuotation] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [clientFilter, setClientFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const loadClients = async () => {
      const data = await getClients();
      setClients(data);
    };
    loadClients();
  }, []);

  const loadData = async () => {
    try {
      const params = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (statusFilter !== "All") params.status = statusFilter;
      if (clientFilter) params.client_id = clientFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const data = await getQuotations(params);
      setListData({ quotations: data.quotations || [], summary: data.summary || null });
    } catch (e) {
      console.error("Failed to load quotations", e);
      toast.error("Failed to load quotations");
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, clientFilter, dateFrom, dateTo]);

  const summary = listData.summary || {};
  const quotations = listData.quotations || [];

  const filteredBySearch = searchQuery.trim()
    ? quotations.filter(
      (q) =>
        (q.quotation_no && q.quotation_no.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (q.client && (q.client.company_name || q.client.client_name || "").toLowerCase().includes(searchQuery.toLowerCase()))
    )
    : quotations;

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
      agreement_content: [],
    });
    setErrors({});
    setEditId(null);
    setTab("basic");
    setOpenForm(true);
  };

  const openEdit = (q) => {
    const items = (q.items || []).map((i) => ({
      item: i.item || "",
      description: i.description || "",
      qty: parseFloat(i.qty) || 1,
      price: i.price != null ? i.price : "",
      tax: parseFloat(i.tax) || 0,
      amount: parseFloat(i.amount) || 0,
    }));
    if (items.length === 0) items.push({ item: "", description: "", qty: 1, price: "", tax: 0, amount: 0 });
    let agreementContent = [];
    try {
      if (q.agreement && q.agreement.content) {
        agreementContent = Array.isArray(q.agreement.content) ? q.agreement.content : JSON.parse(q.agreement.content || "[]");
      }
    } catch {
      agreementContent = [];
    }
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
      agreement_content: agreementContent,
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
    if (!validate()) return;
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
      agreement_content: Array.isArray(form.agreement_content) ? form.agreement_content : [],
    };
    try {
      if (editId) {
        await updateQuotation(editId, payload);
        toast.success("Quotation updated");
      } else {
        await createQuotation(payload);
        toast.success("Quotation created");
      }
      loadData();
      setOpenForm(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save quotation");
    }
  };

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
        <div className={`h-full rounded-full ${color} opacity-30`} style={{ width: "70%" }} />
      </div>
    </div>
  );

  const inputClass = (f) => `input ${errors[f] ? "border-red-500 focus:border-red-500 focus:ring-red-200" : ""}`;

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto animate-fade-in space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Quotation Management</h1>
          <p className="text-slate-500 mt-1 text-base md:text-lg">Create and manage quotations.</p>
        </div>
        <button
          onClick={openAdd}
          className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2 shadow-lg shadow-brand-500/30"
        >
          <Plus size={20} />
          Create Quotation
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6">
        <StatCard title="Total Quotations" value={summary.total ?? 0} icon={FileText} color="bg-slate-600" />
        <StatCard title="Draft" value={summary.draft ?? 0} icon={FileText} color="bg-amber-600" />
        <StatCard title="Sent" value={summary.sent ?? 0} icon={FileText} color="bg-blue-600" />
        <StatCard title="Accepted" value={summary.accepted ?? 0} icon={FileText} color="bg-emerald-600" />
        <StatCard title="Rejected" value={summary.rejected ?? 0} icon={FileText} color="bg-rose-600" />
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by Quotation Number or Client Name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadData()}
              className="pl-9 pr-4 py-2 bg-white border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 w-full"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-100 rounded-xl text-sm font-medium text-slate-600 outline-none focus:border-brand-500 min-w-[120px]"
          >
            <option value="All">All Status</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-100 rounded-xl text-sm font-medium text-slate-600 outline-none focus:border-brand-500 min-w-[160px]"
          >
            <option value="">All Clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.company_name || c.client_name}</option>
            ))}
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-4 py-2 border border-gray-100 rounded-xl text-sm min-w-[140px]"
            placeholder="From"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-4 py-2 border border-gray-100 rounded-xl text-sm min-w-[140px]"
            placeholder="To"
          />
          <button onClick={loadData} className="btn-primary">Apply</button>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-4 md:px-6 md:py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="font-bold text-slate-800">Quotations</h3>
          <span className="text-xs font-semibold text-slate-500 bg-gray-100 px-2 py-1 rounded-lg">
            Showing {filteredBySearch.length}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left min-w-[800px]">
            <thead className="bg-gray-50/50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Quotation No</th>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Expiry Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredBySearch.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-500 italic">No quotations found</td>
                </tr>
              ) : (
                filteredBySearch.map((q) => (
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
        </div>
      </div>

      {openForm && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-2 md:p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[95vh] animate-slide-up overflow-hidden">
            <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
              <h2 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight">
                {editId ? "Edit Quotation" : "Create Quotation"}
              </h2>
              <button onClick={() => setOpenForm(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-gray-100 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>
            <div className="flex px-4 md:px-6 border-b border-gray-100 bg-gray-50/30 overflow-x-auto flex-shrink-0">
              {[
                { id: "basic", label: "Basic Info", icon: User },
                { id: "items", label: "Items / Services", icon: Layers },
                { id: "agreement", label: "Agreement", icon: FileText },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={clsx(
                    "px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap flex items-center gap-2",
                    tab === id ? "border-brand-600 text-brand-600" : "border-transparent text-slate-500 hover:text-slate-800"
                  )}
                >
                  <Icon size={18} />
                  {label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-8">
              {tab === "basic" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="label">Client *</label>
                    <select
                      value={form.client_id}
                      onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                      className={inputClass("client_id")}
                    >
                      <option value="">Select client</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>{c.company_name || c.client_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Quotation Number</label>
                    <input
                      type="text"
                      readOnly
                      className="input bg-gray-50"
                      value={editId ? form.quotation_no : "Auto-generated (e.g. QT-2026-001)"}
                    />
                  </div>
                  <div>
                    <label className="label">Quotation Date *</label>
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className={inputClass("date")}
                    />
                  </div>
                  <div>
                    <label className="label">Expiry Date</label>
                    <input
                      type="date"
                      value={form.expiry_date}
                      onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Reference Number</label>
                    <input
                      type="text"
                      value={form.reference_number}
                      onChange={(e) => setForm({ ...form, reference_number: e.target.value })}
                      className="input"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="label">Sales Person</label>
                    <input
                      type="text"
                      value={form.sales_person}
                      onChange={(e) => setForm({ ...form, sales_person: e.target.value })}
                      className="input"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="label">Status</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      className="input"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="label">Notes (visible to client)</label>
                    <textarea
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      className="input min-h-[80px]"
                      placeholder="Optional"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="label">Internal notes</label>
                    <textarea
                      value={form.internal_notes}
                      onChange={(e) => setForm({ ...form, internal_notes: e.target.value })}
                      className="input min-h-[80px]"
                      placeholder="Optional (not shown to client)"
                    />
                  </div>
                </div>
              )}

              {tab === "items" && (
                <div className="space-y-4">
                  <div className="overflow-x-auto border border-gray-200 rounded-xl">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                        <tr>
                          <th className="px-4 py-3">Item</th>
                          <th className="px-4 py-3">Description</th>
                          <th className="px-4 py-3 w-28 min-w-[7rem]">Qty</th>
                          <th className="px-4 py-3 w-28">Price</th>
                          <th className="px-4 py-3 w-20">Tax %</th>
                          <th className="px-4 py-3 w-28">Amount</th>
                          <th className="px-4 py-3 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(form.items || []).map((row, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                value={row.item}
                                onChange={(e) => updateItem(index, "item", e.target.value)}
                                className="input"
                                placeholder="Item name"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                value={row.description}
                                onChange={(e) => updateItem(index, "description", e.target.value)}
                                className="input"
                                placeholder="Description"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                inputMode="decimal"
                                value={row.qty === "" || row.qty == null ? "" : row.qty}
                                onChange={(e) => updateItem(index, "qty", e.target.value === "" ? "" : e.target.value)}
                                className="input min-w-[6rem] w-full max-w-[7rem] py-2.5 text-base"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={row.price}
                                onChange={(e) => updateItem(index, "price", e.target.value)}
                                className="input"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={row.tax}
                                onChange={(e) => updateItem(index, "tax", e.target.value)}
                                className="input w-16"
                              />
                            </td>
                            <td className="px-4 py-2 font-medium text-slate-800">
                              ₹{(parseFloat(row.amount) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-2">
                              {(form.items || []).length > 1 && (
                                <button type="button" onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700 p-1">
                                  <Trash2 size={18} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button type="button" onClick={addItem} className="flex items-center gap-2 text-brand-600 font-bold hover:text-brand-700">
                    <Plus size={18} /> Add Item
                  </button>
                  <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 max-w-md space-y-3 mt-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Subtotal</span>
                      <span className="font-medium">₹{subtotalForm.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div>
                      <label className="label text-xs">Discount (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="input"
                        placeholder="0.00"
                        value={form.discount}
                        onChange={(e) => setForm({ ...form, discount: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label text-xs">Tax (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="input"
                        placeholder="0.00"
                        value={form.tax}
                        onChange={(e) => setForm({ ...form, tax: e.target.value })}
                      />
                    </div>
                    <div className="flex justify-between text-base font-bold border-t border-gray-200 pt-2">
                      <span>Total</span>
                      <span>₹{totalForm.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              )}

              {tab === "agreement" && (
                <div className="max-w-3xl">
                  <AgreementTab
                    value={form.agreement_content || []}
                    onChange={(v) => setForm({ ...form, agreement_content: v })}
                    clientId={form.client_id}
                    quotationId={editId}
                  />
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <p className="text-sm text-slate-500 font-bold uppercase">Total: ₹{totalForm.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setOpenForm(false)} className="btn-secondary">Cancel</button>
                <button type="button" onClick={handleSave} className="btn-primary shadow-lg shadow-brand-500/30">Save Quotation</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <QuotationView
        isOpen={openView}
        onClose={() => { setOpenView(false); setViewQuotation(null); }}
        quotation={viewQuotation}
        onEdit={() => { setOpenView(false); if (viewQuotation) openEdit(viewQuotation); }}
        onDelete={() => viewQuotation && handleDelete(viewQuotation.id)}
        onConvertToInvoice={() => viewQuotation && handleConvertToInvoice(viewQuotation)}
        onSaved={() => loadData()}
      />
    </div>
  );
}

export default Quotations;
