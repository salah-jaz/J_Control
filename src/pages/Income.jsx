import { useEffect, useState } from "react";
import { Eye, Edit2, Trash2, Plus, Download, Search, X, Check, Landmark } from "lucide-react";
import toast from "react-hot-toast";
import { exportToCSV } from "../utils/csvExport";

import { getIncomes, createIncome, updateIncome, deleteIncome } from "../services/incomeService";
import { getBankAccounts } from "../services/bankAccountService";
import { getClients } from "../services/db";
import clsx from "clsx";

const emptyForm = {
  client: "",
  source: "",
  project: "",
  category: "",
  invoiceNo: "",
  amount: "",
  currency: "INR",

  method: "Other",
  transactionId: "",
  bank: "",
  bankAccountId: null,
  receivedDate: "",
  status: "Received",

  staff: "",
  department: "",
  notes: "",
  description: "",
  referenceNumber: "",
  invoiceDate: "",
  dueDate: "",
  recurring: "No",
  frequency: "",
  clientEmail: "",
  clientPhone: "",
  paymentTerms: "",
  collectionStatus: "Collected",
  followUpDate: "",
  commission: "",
  taxCategory: "",

  // Financial Summary
  autoCalculateAmount: true,
  discount: "",
  taxAmount: "",
  initialDepositEnabled: false,
  initialDepositAmount: "",
  initialDepositBankId: null,
  initialDepositBankName: "",
  extraInstallments: [],
};

export default function Income() {
  const [data, setData] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [tab, setTab] = useState("basic");

  const [openForm, setOpenForm] = useState(false);
  const [openView, setOpenView] = useState(false);

  const [editId, setEditId] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [bankModalFor, setBankModalFor] = useState(null);

  /* LOAD */
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const records = await getIncomes();
      setData(records);
      const banks = await getBankAccounts();
      setBankAccounts(banks);
      const clientsData = await getClients();
      setClients(clientsData);
    } catch (e) {
      console.error("Failed to load data", e);
    }
  };

  const subtotal = parseFloat(form.amount) || 0;
  const discountVal = parseFloat(form.discount) || 0;
  const taxVal = parseFloat(form.taxAmount) || 0;
  const totalAmount = subtotal - discountVal + taxVal;
  const initialDeposit = form.initialDepositEnabled ? (parseFloat(form.initialDepositAmount) || 0) : 0;
  const sumInstallments = (form.extraInstallments || []).reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const balanceDue = totalAmount - initialDeposit - sumInstallments;
  const isSavedRecord = !!editId;

  const openAdd = () => {
    setForm(emptyForm);
    setErrors({});
    setEditId(null);
    setTab("basic");
    setOpenForm(true);
  };

  const getBankDisplayName = (bankId) => {
    const b = bankAccounts.find((x) => x.id === bankId);
    return b ? `${b.bankName} - ${b.accountNumber}` : "";
  };

  const openEdit = (item) => {
    const extra = Array.isArray(item.extraInstallments) ? item.extraInstallments : [];
    const hasInitial = item.initialDepositAmount != null && item.initialDepositAmount !== "" && parseFloat(item.initialDepositAmount) > 0;
    const loaded = {
      ...emptyForm,
      ...item,
      discount: item.discountAmount != null && item.discountAmount !== "" ? String(item.discountAmount) : "",
      taxAmount: item.gstAmount != null && item.gstAmount !== "" ? String(item.gstAmount) : "",
      extraInstallments: extra.map((i) => ({ ...i, bankName: i.bankName || getBankDisplayName(i.bankAccountId) })),
      initialDepositEnabled: !!hasInitial,
      initialDepositAmount: hasInitial ? String(item.initialDepositAmount) : "",
      initialDepositBankId: item.initialDepositBankId || null,
      initialDepositBankName: item.initialDepositBankName || getBankDisplayName(item.initialDepositBankId),
    };
    setForm(loaded);
    setErrors({});
    setEditId(item.id);
    setTab("basic");
    setOpenForm(true);
  };

  const openViewModal = (item) => {
    setViewItem(item);
    setOpenView(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this income record?")) return;
    try {
      await deleteIncome(id);
      toast.success("Income record deleted successfully");
      loadData();
    } catch (e) {
      toast.error("Failed to delete record");
    }
  };

  const validate = () => {
    const e = {};
    if (!form.client) e.client = "Client is required";
    if (!form.source) e.source = "Income source is required";
    if (!form.amount) e.amount = "Subtotal (Amount) is required";
    if (Object.keys(e).length > 0) {
      setErrors(e);
      toast.error(Object.values(e)[0]);
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;

    try {
      if (editId) {
        await updateIncome(editId, form);
        toast.success("Income updated successfully");
      } else {
        await createIncome(form);
        toast.success("Income added successfully");
      }
      await loadData();
      setOpenForm(false);
    } catch (e) {
      console.error("Failed to save", e);
      if (e.response && e.response.data && e.response.data.errors) {
        setErrors(e.response.data.errors);
        toast.error("Server validation failed. Please check the form.");
      } else {
        toast.error("Failed to save record: " + (e.message || "Unknown error"));
      }
    }
  };

  const inputClass = (f) => `input ${errors[f] ? "border-red-500 focus:border-red-500 focus:ring-red-200" : ""}`;

  const Req = () => <span className="text-red-500 ml-1 font-bold">*</span>;

  /* FILTER DATA */
  const filteredData = data.filter((item) =>
    Object.values(item).some(
      (val) =>
        val &&
        val.toString().toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto animate-fade-in space-y-6 md:space-y-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Income Records</h1>
          <p className="text-slate-500 mt-1 text-base md:text-lg">Track and manage your incoming payments.</p>
        </div>
        <button
          onClick={openAdd}
          className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2 shadow-lg shadow-brand-500/30"
        >
          <Plus size={20} />
          Add Income
        </button>
      </div>

      {/* TABLE */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-4 md:px-6 md:py-5 border-b border-gray-100 flex flex-col lg:flex-row justify-between items-start lg:items-center bg-gray-50/50 gap-4">
          <h3 className="font-bold text-slate-800">Recent Transactions</h3>
          <div className="flex flex-wrap gap-2 w-full lg:w-auto">
            <div className="relative flex-1 lg:flex-none">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 md:w-64 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              onClick={() => exportToCSV(filteredData, "income_records")}
              className="p-2 bg-white border border-gray-200 rounded-lg text-slate-500 hover:bg-gray-50 transition-colors"
              title="Export to CSV"
            >
              <Download size={18} />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm text-left min-w-[800px]">
            <thead className="bg-gray-50/50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Source</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4">Method</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500 italic">
                    No income records found
                  </td>
                </tr>
              ) : (
                filteredData.map((item, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 font-medium text-slate-900">{item.client}</td>
                    <td className="px-6 py-4 text-slate-600">{item.source}</td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900 font-mono">
                      ₹{parseFloat(item.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-gray-100 border border-gray-200 rounded-lg text-xs font-semibold text-slate-600">
                        {item.method}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-mono text-xs">{item.receivedDate}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openViewModal(item)}
                          title="View"
                          className="p-2 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => openEdit(item)}
                          title="Edit"
                          className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          title="Delete"
                          className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VIEW MODAL */}
      {openView && viewItem && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-2 md:p-4 backdrop-blur-sm">
          <div className="bg-white max-w-2xl w-full rounded-2xl shadow-2xl animate-slide-up flex flex-col max-h-[95vh] overflow-hidden">
            <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight">Transaction Details</h2>
              <button onClick={() => setOpenView(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-gray-100 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 md:p-8 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6 overflow-y-auto">
              {Object.entries(viewItem).map(([k, v]) => (
                <div key={k} className="flex flex-col">
                  <p className="text-[10px] md:text-xs font-bold text-brand-600 uppercase tracking-wider mb-1">
                    {k.replace(/([A-Z])/g, ' $1').trim()}
                  </p>
                  <p className="text-sm md:text-base font-medium text-slate-800 break-words">{v || <span className="text-slate-400 italic">None</span>}</p>
                </div>
              ))}
            </div>

            <div className="p-4 md:p-6 bg-gray-50/50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setOpenView(false)}
                className="btn-secondary"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FORM MODAL */}
      {openForm && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-2 md:p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[95vh] animate-slide-up overflow-hidden">
            <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center bg-white flex-shrink-0">
              <div>
                <h2 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight">
                  {editId ? "Edit Transaction" : "New Income Entry"}
                </h2>
                <p className="text-xs md:text-sm text-slate-500 mt-1">Fill in the details for this transaction.</p>
              </div>
              <button onClick={() => setOpenForm(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-gray-100 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>

            {/* TABS */}
            <div className="flex px-4 md:px-6 border-b border-gray-100 bg-gray-50/30 overflow-x-auto custom-scrollbar flex-shrink-0">
              {[
                { id: "basic", label: "Basic" },
                { id: "financial", label: "Financial Summary" },
                { id: "installments", label: "Extra Installments" },
                { id: "internal", label: "Internal" },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={clsx(
                    "px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-sm font-bold uppercase tracking-wide border-b-2 transition-all whitespace-nowrap",
                    tab === id ? "border-brand-600 text-brand-600" : "border-transparent text-slate-500 hover:text-slate-800 hover:border-gray-200"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* FORM CONTENT */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {tab === "basic" && (
                  <>
                    <div>
                      <label className="label">
                        Client <Req />
                      </label>
                      <select
                        className={inputClass("client")}
                        value={form.client}
                        onChange={(e) =>
                          setForm({ ...form, client: e.target.value })
                        }
                      >
                        <option value="">Select Client</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.company_name || c.client_name}>
                            {c.company_name || c.client_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">
                        Income Source <Req />
                      </label>
                      <input
                        className={inputClass("source")}
                        placeholder="e.g. Consulting"
                        value={form.source}
                        onChange={(e) =>
                          setForm({ ...form, source: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="label">
                        Project / Service
                      </label>
                      <input
                        className="input"
                        value={form.project}
                        onChange={(e) =>
                          setForm({ ...form, project: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="label">
                        Category
                      </label>
                      <input
                        className="input"
                        value={form.category}
                        onChange={(e) =>
                          setForm({ ...form, category: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="label">
                        Invoice No
                      </label>
                      <input
                        className="input"
                        value={form.invoiceNo}
                        onChange={(e) =>
                          setForm({ ...form, invoiceNo: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="label">
                        Subtotal (₹) <Req />
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className={inputClass("amount")}
                        placeholder="0.00"
                        value={form.amount}
                        onChange={(e) =>
                          setForm({ ...form, amount: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <label className="label">
                        Description
                      </label>
                      <textarea
                        className="input min-h-[80px]"
                        placeholder="Detailed description of the income"
                        value={form.description}
                        onChange={(e) =>
                          setForm({ ...form, description: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <label className="label">
                        Reference Number
                      </label>
                      <input
                        className="input"
                        placeholder="Internal reference or PO number"
                        value={form.referenceNumber}
                        onChange={(e) =>
                          setForm({ ...form, referenceNumber: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <label className="label">
                        Invoice Date
                      </label>
                      <input
                        type="date"
                        className="input"
                        value={form.invoiceDate}
                        onChange={(e) =>
                          setForm({ ...form, invoiceDate: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <label className="label">
                        Client Email
                      </label>
                      <input
                        type="email"
                        className="input"
                        placeholder="client@example.com"
                        value={form.clientEmail}
                        onChange={(e) =>
                          setForm({ ...form, clientEmail: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <label className="label">
                        Client Phone
                      </label>
                      <input
                        className="input"
                        placeholder="+91-9876543210"
                        value={form.clientPhone}
                        onChange={(e) =>
                          setForm({ ...form, clientPhone: e.target.value })
                        }
                      />
                    </div>
                  </>
                )}

                {tab === "financial" && (
                  <div className="md:col-span-2 space-y-6">
                    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                      <h3 className="text-base font-bold text-slate-800 mb-4">Financial Summary</h3>
                      <div className="flex items-center gap-2 mb-4">
                        <input
                          type="checkbox"
                          id="autoCalc"
                          checked={form.autoCalculateAmount}
                          onChange={(e) => setForm({ ...form, autoCalculateAmount: e.target.checked })}
                          className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                        />
                        <label htmlFor="autoCalc" className="text-sm font-medium text-slate-700">Auto-calculate Amount</label>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="label">Subtotal (₹)</label>
                          <input type="text" readOnly className="input bg-gray-50" value={form.amount ? `₹${Number(form.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "₹0.00"} />
                        </div>
                        <div>
                          <label className="label">Discount (₹)</label>
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
                          <label className="label">Tax Amount (₹)</label>
                          <input
                            type="number"
                            step="0.01"
                            className="input"
                            placeholder="0.00"
                            value={form.taxAmount}
                            onChange={(e) => setForm({ ...form, taxAmount: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="label">Total Amount (₹)</label>
                          <input type="text" readOnly className="input bg-brand-50 font-bold" value={`₹${totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`} />
                        </div>
                      </div>
                      <div className="mt-6 pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-2 mb-4">
                          <input
                            type="checkbox"
                            id="initialDeposit"
                            checked={form.initialDepositEnabled}
                            onChange={(e) => setForm({ ...form, initialDepositEnabled: e.target.checked, initialDepositAmount: e.target.checked ? form.initialDepositAmount : "", initialDepositBankId: e.target.checked ? form.initialDepositBankId : null, initialDepositBankName: e.target.checked ? form.initialDepositBankName : "" })}
                            className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                          />
                          <label htmlFor="initialDeposit" className="text-sm font-medium text-slate-700">Initial Deposit</label>
                        </div>
                        {form.initialDepositEnabled && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="label">Initial Deposit Amount (₹)</label>
                              <input
                                type="number"
                                step="0.01"
                                readOnly={isSavedRecord}
                                className="input"
                                placeholder="0.00"
                                value={form.initialDepositAmount}
                                onChange={(e) => setForm({ ...form, initialDepositAmount: e.target.value })}
                              />
                            </div>
                            <div>
                              <label className="label">Bank Account</label>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => { setBankModalFor("initial"); setBankModalOpen(true); }}
                                  disabled={isSavedRecord}
                                  className="btn-secondary flex-1"
                                >
                                  {form.initialDepositBankName || "Select Bank"}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="mt-4">
                          <label className="label">Balance Due (₹)</label>
                          <input type="text" readOnly className="input bg-amber-50 font-bold text-slate-800" value={`₹${Math.max(0, balanceDue).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {tab === "installments" && (
                  <div className="md:col-span-2 space-y-6">
                    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-base font-bold text-slate-800">Extra Installments (Split Payments)</h3>
                        <button type="button" onClick={() => setForm({ ...form, extraInstallments: [...(form.extraInstallments || []), { date: "", amount: "", bankAccountId: null, bankName: "", note: "" }] })} className="btn-primary flex items-center gap-2">
                          <Plus className="w-4 h-4" /> Add Payment
                        </button>
                      </div>
                      <p className="text-sm text-slate-500 mb-4">Track multiple income payments. {isSavedRecord && "Saved payments are read-only; you can only add new ones."}</p>
                      <div className="space-y-4">
                        {(form.extraInstallments || []).length === 0 ? (
                          <p className="text-sm text-slate-400 py-6 text-center">No payments added yet. Click &quot;+ Add Payment&quot; to add one.</p>
                        ) : (
                          (form.extraInstallments || []).map((row, idx) => (
                            <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 rounded-xl border border-gray-100 bg-gray-50/50 items-end">
                              <div className="md:col-span-2">
                                <label className="label text-xs">Date</label>
                                <input
                                  type="date"
                                  readOnly={isSavedRecord}
                                  className="input"
                                  value={row.date}
                                  onChange={(e) => {
                                    const next = [...(form.extraInstallments || [])];
                                    next[idx] = { ...next[idx], date: e.target.value };
                                    setForm({ ...form, extraInstallments: next });
                                  }}
                                />
                              </div>
                              <div className="md:col-span-2">
                                <label className="label text-xs">Amount (₹)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  readOnly={isSavedRecord}
                                  className="input"
                                  placeholder="0.00"
                                  value={row.amount}
                                  onChange={(e) => {
                                    const next = [...(form.extraInstallments || [])];
                                    next[idx] = { ...next[idx], amount: e.target.value };
                                    setForm({ ...form, extraInstallments: next });
                                  }}
                                />
                              </div>
                              <div className="md:col-span-3">
                                <label className="label text-xs">Bank Account</label>
                                <button
                                  type="button"
                                  disabled={isSavedRecord}
                                  onClick={() => { setBankModalFor({ type: "installment", index: idx }); setBankModalOpen(true); }}
                                  className="input w-full text-left truncate bg-white"
                                >
                                  {row.bankName || "Select Bank"}
                                </button>
                              </div>
                              <div className="md:col-span-3">
                                <label className="label text-xs">Note</label>
                                <input
                                  type="text"
                                  readOnly={isSavedRecord}
                                  className="input"
                                  placeholder="Optional"
                                  value={row.note}
                                  onChange={(e) => {
                                    const next = [...(form.extraInstallments || [])];
                                    next[idx] = { ...next[idx], note: e.target.value };
                                    setForm({ ...form, extraInstallments: next });
                                  }}
                                />
                              </div>
                              <div className="md:col-span-2 flex justify-end">
                                {!isSavedRecord && (
                                  <button type="button" onClick={() => setForm({ ...form, extraInstallments: (form.extraInstallments || []).filter((_, i) => i !== idx) })} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {tab === "internal" && (
                  <>
                    <div>
                      <label className="label">
                        Account Manager / Staff
                      </label>
                      <input
                        className="input"
                        placeholder="Name of staff"
                        value={form.staff}
                        onChange={(e) =>
                          setForm({ ...form, staff: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="label">
                        Department
                      </label>
                      <input
                        className="input"
                        placeholder="Sales / Ops"
                        value={form.department}
                        onChange={(e) =>
                          setForm({ ...form, department: e.target.value })
                        }
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="label">
                        Internal Notes
                      </label>
                      <textarea
                        className="input min-h-[120px]"
                        placeholder="Add specific details about this transaction..."
                        value={form.notes}
                        onChange={(e) =>
                          setForm({ ...form, notes: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <label className="label">
                        Collection Status
                      </label>
                      <select
                        className="input"
                        value={form.collectionStatus}
                        onChange={(e) =>
                          setForm({ ...form, collectionStatus: e.target.value })
                        }
                      >
                        <option>Collected</option>
                        <option>Overdue</option>
                        <option>Partially Paid</option>
                        <option>Written Off</option>
                      </select>
                    </div>

                    <div>
                      <label className="label">
                        Follow-up Date
                      </label>
                      <input
                        type="date"
                        className="input"
                        value={form.followUpDate}
                        onChange={(e) =>
                          setForm({ ...form, followUpDate: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <label className="label">
                        Commission (₹)
                      </label>
                      <input
                        type="number"
                        className="input"
                        placeholder="If applicable"
                        value={form.commission}
                        onChange={(e) =>
                          setForm({ ...form, commission: e.target.value })
                        }
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Select Bank Account Modal */}
            {bankModalOpen && (
              <div className="absolute inset-0 bg-slate-900/60 z-10 flex items-center justify-center p-4 rounded-2xl">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800">Select Bank Account</h3>
                    <button type="button" onClick={() => { setBankModalOpen(false); setBankModalFor(null); }} className="p-2 text-slate-400 hover:text-slate-600 rounded-full">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="overflow-y-auto p-4 space-y-2">
                    {bankAccounts.length === 0 ? (
                      <p className="text-sm text-slate-500">No bank accounts found. Add one in Bank Accounts.</p>
                    ) : (
                      bankAccounts.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => {
                            const name = `${b.bankName} - ${b.accountNumber}`;
                            if (bankModalFor === "initial") {
                              setForm((prev) => ({ ...prev, initialDepositBankId: b.id, initialDepositBankName: name }));
                            } else if (bankModalFor && bankModalFor.type === "installment" && typeof bankModalFor.index === "number") {
                              const next = [...(form.extraInstallments || [])];
                              next[bankModalFor.index] = { ...next[bankModalFor.index], bankAccountId: b.id, bankName: name };
                              setForm((prev) => ({ ...prev, extraInstallments: next }));
                            }
                            setBankModalOpen(false);
                            setBankModalFor(null);
                          }}
                          className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-brand-200 hover:bg-brand-50/50 text-left transition-colors"
                        >
                          <Landmark className="w-5 h-5 text-brand-600" />
                          <span className="font-medium text-slate-800">{b.bankName} - {b.accountNumber}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* FOOTER */}
            <div className="flex justify-end gap-3 p-4 md:p-6 border-t border-gray-100 bg-white flex-shrink-0">
              <button
                onClick={() => setOpenForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="btn-primary"
              >
                Save Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
