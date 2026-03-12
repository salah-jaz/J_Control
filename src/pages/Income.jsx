import { useEffect, useState, useRef, useMemo } from "react";
import { Eye, Edit2, Trash2, Plus, Download, Search, X, Check, Landmark, Wallet, TrendingUp, AlertCircle, Receipt, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { exportToCSV } from "../utils/csvExport";

import { createIncome, updateIncome, deleteIncome } from "../services/incomeService";
import { getBankAccounts } from "../services/bankAccountService";
import { getIncomeCategories, createIncomeCategory, deleteIncomeCategory } from "../services/incomeCategoryService";
import { useIncomeList, useIncomeSummary, useClients } from "../hooks/useApiQueries";
import { invalidateCache } from "../utils/apiFetch";
import { queryKeys } from "../query/queryKeys";
import clsx from "clsx";
import { TableSkeleton } from "../components/Skeleton";

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
  const [bankAccounts, setBankAccounts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [tab, setTab] = useState("basic");

  const [openForm, setOpenForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewDetail, setViewDetail] = useState(null);

  const [editId, setEditId] = useState(null);
  const [savedExtraInstallmentsCount, setSavedExtraInstallmentsCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [bankModalFor, setBankModalFor] = useState(null);
  const [firstInvalidBankKey, setFirstInvalidBankKey] = useState(null);
  const firstInvalidBankRef = useRef(null);

  const [incomeCategories, setIncomeCategories] = useState([]);
  const [addCategoryModalOpen, setAddCategoryModalOpen] = useState(false);
  const [manageCategoriesModalOpen, setManageCategoriesModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addCategorySaving, setAddCategorySaving] = useState(false);

  const [searchDebounced, setSearchDebounced] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [bankFilter, setBankFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  const filters = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    let date_from = undefined;
    let date_to = undefined;
    if (dateFilter === "Today") {
      date_from = today;
      date_to = today;
    } else if (dateFilter === "This Week") {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      date_from = weekStart.toISOString().split("T")[0];
      date_to = today;
    } else if (dateFilter === "This Month") {
      date_from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      date_to = today;
    } else if (dateFilter === "This Year") {
      date_from = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
      date_to = today;
    }
    return {
      search: searchDebounced.trim() || undefined,
      status: statusFilter === "All" ? undefined : statusFilter,
      category: categoryFilter || undefined,
      bank_account_id: bankFilter || undefined,
      date_from,
      date_to,
      page: currentPage,
      per_page: 20,
    };
  }, [searchDebounced, statusFilter, categoryFilter, bankFilter, dateFilter, currentPage]);

  const { data: incomeResult, isLoading: incomeLoading } = useIncomeList(filters);
  const { data: incomeSummaryFromQuery } = useIncomeSummary();
  const { data: clientsResult } = useClients({ per_page: 100 });
  const queryClient = useQueryClient();

  const incomeRecords = Array.isArray(incomeResult?.data) ? incomeResult.data : [];
  const incomeMeta = incomeResult?.meta ?? null;
  const incomeSummary = incomeSummaryFromQuery ?? null;
  const clients = Array.isArray(clientsResult?.data) ? clientsResult.data : [];

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchDebounced, statusFilter, categoryFilter, bankFilter, dateFilter]);

  /* Load banks and categories for forms/filters */
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getIncomeCategories().catch(() => []),
      getBankAccounts().then((b) => b),
    ]).then(([categories, banks]) => {
      if (!cancelled) {
        setIncomeCategories(categories || []);
        setBankAccounts(Array.isArray(banks) ? banks : []);
      }
    });
    return () => { cancelled = true; };
  }, []);

  /* Auto-focus first invalid bank field when save is blocked by bank validation */
  useEffect(() => {
    if (!firstInvalidBankKey) return;
    const timer = setTimeout(() => {
      if (firstInvalidBankRef.current) {
        firstInvalidBankRef.current.focus();
      }
      setFirstInvalidBankKey(null);
    }, 100);
    return () => clearTimeout(timer);
  }, [firstInvalidBankKey]);

  const loadData = async () => {
    try {
      queryClient.invalidateQueries({ queryKey: queryKeys.income.all });
      const [categories, banks] = await Promise.all([
        getIncomeCategories().catch(() => []),
        getBankAccounts().then((b) => (Array.isArray(b) ? b : [])),
      ]);
      setIncomeCategories(categories || []);
      setBankAccounts(Array.isArray(banks) ? banks : []);
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
    setSavedExtraInstallmentsCount(0);
    setFirstInvalidBankKey(null);
    setTab("basic");
    setIsSaving(false);
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
    setSavedExtraInstallmentsCount(extra.length);
    setFirstInvalidBankKey(null);
    setTab("basic");
    setIsSaving(false);
    setOpenForm(true);
  };

  const openViewModal = (income) => {
    if (!income?.id) return;
    setViewDetail(income);
    setViewModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this income record?")) return;
    try {
      await deleteIncome(id);
      toast.success("Income record deleted successfully");
      invalidateCache("/incomes");
      invalidateCache("/transactions");
      queryClient.invalidateQueries({ queryKey: queryKeys.income.all });
      loadData();
    } catch (e) {
      toast.error("Failed to delete record");
    }
  };

  const validate = () => {
    const e = {};
    if (!form.client) e.client = "Client is required";
    if (!form.amount) e.amount = "Subtotal (Amount) is required";

    // Initial Deposit: if enabled and amount > 0, bank is required
    const initialAmt = parseFloat(form.initialDepositAmount) || 0;
    if (form.initialDepositEnabled && initialAmt > 0 && !form.initialDepositBankId) {
      e.initialDepositBank = "Please select bank account for initial deposit";
    }

    // Extra Installments: if amount > 0, bank is required for that row
    (form.extraInstallments || []).forEach((row, idx) => {
      const amt = parseFloat(row.amount) || 0;
      if (amt > 0 && !row.bankAccountId) {
        e[`installmentBank_${idx}`] = "Please select bank account for installment payment";
      }
    });

    // Category optional; if entered, must be from dropdown
    if (form.category && !incomeCategories.some((c) => c.name === form.category)) {
      e.category = "Please select a category from the list";
    }

    if (Object.keys(e).length > 0) {
      setErrors(e);
      const bankMsg = e.initialDepositBank || (() => {
        const k = Object.keys(e).find((key) => key.startsWith("installmentBank_"));
        return k ? e[k] : null;
      })();
      toast.error(bankMsg || e.client || e.source || e.amount || Object.values(e)[0]);
      if (e.initialDepositBank) {
        setFirstInvalidBankKey("initialDepositBank");
        setTab("summary");
      } else {
        const firstIdx = (form.extraInstallments || []).findIndex((_, i) => e[`installmentBank_${i}`]);
        if (firstIdx >= 0) {
          setFirstInvalidBankKey(`installmentBank_${firstIdx}`);
          setTab("installments");
        }
      }
      return false;
    }
    setFirstInvalidBankKey(null);
    return true;
  };

  const handleSave = async () => {
    if (isSaving) return;
    if (!validate()) return;

    setIsSaving(true);
    try {
      if (editId) {
        await updateIncome(editId, form);
        toast.success("Income updated successfully");
      } else {
        await createIncome(form);
        toast.success("Income added successfully");
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.income.all });
      await queryClient.refetchQueries({ queryKey: queryKeys.income.all });
      await loadData();
      setOpenForm(false);
    } catch (e) {
      console.error("Failed to save", e);
      setIsSaving(false);
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

  const displayStatus = (status) => {
    if (status === "Fully Paid") return "Paid";
    if (status === "Partially Paid") return "Partial";
    return status || "—";
  };

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

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <StatCard
          title="Total Income"
          value={incomeSummary != null ? `₹${Number(incomeSummary.totalIncome || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
          icon={Wallet}
          color="bg-slate-600"
        />
        <StatCard
          title="Amount Received"
          value={incomeSummary != null ? `₹${Number(incomeSummary.totalReceived || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
          icon={TrendingUp}
          color="bg-emerald-600"
        />
        <StatCard
          title="Balance Due"
          value={incomeSummary != null ? `₹${Number(incomeSummary.totalBalance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
          icon={AlertCircle}
          color="bg-amber-600"
        />
        <StatCard
          title="Total Transactions"
          value={incomeSummary != null ? String(incomeSummary.totalCount ?? 0) : "—"}
          icon={Receipt}
          color="bg-blue-600"
        />
      </div>

      {/* SEARCH & FILTERS */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search income..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 w-full transition-all shadow-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 lg:flex-none px-4 py-2 bg-white border border-gray-100 rounded-xl text-sm font-medium text-slate-600 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 cursor-pointer transition-all hover:border-gray-200 shadow-sm min-w-[120px]"
          >
            <option value="All">All</option>
            <option value="Paid">Paid</option>
            <option value="Partial">Partial</option>
            <option value="Unpaid">Unpaid</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="flex-1 lg:flex-none px-4 py-2 bg-white border border-gray-100 rounded-xl text-sm font-medium text-slate-600 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 cursor-pointer transition-all hover:border-gray-200 shadow-sm min-w-[140px]"
          >
            <option value="">All Categories</option>
            {incomeCategories.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
          <select
            value={bankFilter}
            onChange={(e) => setBankFilter(e.target.value)}
            className="flex-1 lg:flex-none px-4 py-2 bg-white border border-gray-100 rounded-xl text-sm font-medium text-slate-600 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 cursor-pointer transition-all hover:border-gray-200 shadow-sm min-w-[160px]"
          >
            <option value="">All Banks</option>
            {bankAccounts.map((b) => (
              <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber}</option>
            ))}
          </select>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="flex-1 lg:flex-none px-4 py-2 bg-white border border-gray-100 rounded-xl text-sm font-medium text-slate-600 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 cursor-pointer transition-all hover:border-gray-200 shadow-sm min-w-[120px]"
          >
            <option value="All">All Time</option>
            <option value="Today">Today</option>
            <option value="This Week">This Week</option>
            <option value="This Month">This Month</option>
            <option value="This Year">This Year</option>
          </select>
        </div>
      </div>

      {/* TABLE */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-4 md:px-6 md:py-5 border-b border-gray-100 flex flex-col lg:flex-row justify-between items-start lg:items-center bg-gray-50/50 gap-4">
          <h3 className="font-bold text-slate-800">Income Records</h3>
          <div className="flex flex-wrap gap-2 w-full lg:w-auto">
            <span className="text-xs font-semibold text-slate-500 bg-gray-100 px-2 py-1 rounded-lg self-center">
              {incomeLoading ? "Loading..." : incomeMeta
                ? `Showing ${(incomeMeta.current_page - 1) * incomeMeta.per_page + 1}–${Math.min(incomeMeta.current_page * incomeMeta.per_page, incomeMeta.total)} of ${incomeMeta.total}`
                : `Showing ${incomeRecords.length} of ${incomeRecords.length}`}
            </span>
            <button
              onClick={() => exportToCSV(incomeRecords.map((r) => ({ id: r.id, client: r.client, amount: r.amount, method: r.method, date: r.receivedDate, bank: r.bank, status: r.status })), "income_records")}
              className="p-2 bg-white border border-gray-200 rounded-lg text-slate-500 hover:bg-gray-50 transition-colors"
              title="Export to CSV"
            >
              <Download size={18} />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          {incomeLoading ? (
            <TableSkeleton rows={6} cols={7} />
          ) : (
          <table className="w-full text-sm text-left min-w-[800px]">
            <thead className="bg-gray-50/50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4">Method</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Bank</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {incomeRecords.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <Receipt className="h-12 w-12 mb-3 opacity-20" />
                      <p className="text-lg font-medium text-gray-500">No income records found</p>
                      <p className="text-sm">Add an income record or adjust your filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                incomeRecords.map((income) => (
                  <tr key={income.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-600">{income.id}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{income.client || "-"}</td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900 font-mono">
                      ₹{parseFloat(income.amount || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-gray-100 border border-gray-200 rounded-lg text-xs font-semibold text-slate-600">
                        {income.method || "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-mono text-xs">{income.receivedDate || "-"}</td>
                    <td className="px-6 py-4 text-slate-600 text-xs">{income.bank || "-"}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        {income.invoice_id && (
                          <span className="px-2 py-1 bg-violet-50 text-violet-700 border border-violet-200 rounded-lg text-xs font-semibold" title="Created from Invoice">
                            Invoice Linked
                          </span>
                        )}
                        <button
                          onClick={() => openViewModal(income)}
                          title="View"
                          className="p-2 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                        >
                          <Eye size={18} />
                        </button>
                        {!income.invoice_id && (
                          <>
                            <button
                              onClick={() => openEdit(income)}
                              title="Edit"
                              className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(income.id)}
                              title="Delete"
                              className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
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
        {incomeMeta && incomeMeta.last_page > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
            <span className="text-sm text-slate-600">
              Showing {(incomeMeta.current_page - 1) * incomeMeta.per_page + 1}–{Math.min(incomeMeta.current_page * incomeMeta.per_page, incomeMeta.total)} of {incomeMeta.total}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={incomeMeta.current_page <= 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-slate-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={incomeMeta.current_page >= incomeMeta.last_page}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-slate-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Income details modal - uses current list row (viewDetail) */}
      {viewModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-2 md:p-4 backdrop-blur-sm">
          <div className="bg-white max-w-lg w-full rounded-2xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
            <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight">Income Details</h2>
              <button
                onClick={() => {
                  setViewModalOpen(false);
                  setViewDetail(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-gray-100 rounded-full transition-all"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 md:p-6 overflow-y-auto">
              {viewDetail ? (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="text-slate-500">ID</div>
                  <div className="font-semibold text-slate-800">{viewDetail.id}</div>
                  <div className="text-slate-500">Amount</div>
                  <div className="font-bold text-slate-900">₹ {parseFloat(viewDetail.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                  <div className="text-slate-500">Bank</div>
                  <div className="font-medium text-slate-800">{viewDetail.bank || "-"}</div>
                  <div className="text-slate-500">Client</div>
                  <div className="font-medium text-slate-800">{viewDetail.client || "-"}</div>
                  <div className="text-slate-500">Date</div>
                  <div className="font-medium text-slate-800">{viewDetail.receivedDate || "-"}</div>
                  <div className="text-slate-500">Method</div>
                  <div className="font-medium text-slate-800">{viewDetail.method || "-"}</div>
                  <div className="text-slate-500">Status</div>
                  <div className="font-medium text-slate-800">{displayStatus(viewDetail.status)}</div>
                  <div className="text-slate-500">Reference</div>
                  <div className="font-mono text-xs text-slate-700">{viewDetail.referenceNumber || "-"}</div>
                </div>
              ) : (
                <p className="text-slate-500 text-center py-8">No details available.</p>
              )}
              {viewDetail?.description && (
                <div className="mt-4">
                  <div className="text-slate-500 text-sm mb-1">Description</div>
                  <p className="text-slate-800 text-sm">{viewDetail.description}</p>
                </div>
              )}
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
                        Income Source
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
                      <label className="label">Category</label>
                      <div className="flex gap-2">
                        <select
                          className={clsx("input flex-1", errors.category && "border-red-500 focus:border-red-500 focus:ring-red-200")}
                          value={form.category}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === "__add__") {
                              setAddCategoryModalOpen(true);
                              return;
                            }
                            if (v === "__manage__") {
                              setManageCategoriesModalOpen(true);
                              return;
                            }
                            setForm({ ...form, category: v });
                          }}
                        >
                          <option value="">Select Category</option>
                          {incomeCategories.map((c) => (
                            <option key={c.id} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                          <option value="__add__">— Add New Category —</option>
                          <option value="__manage__">— Manage Categories —</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => setAddCategoryModalOpen(true)}
                          className="btn-primary whitespace-nowrap flex items-center gap-1"
                          title="Add category"
                        >
                          <Plus className="w-4 h-4" /> Add
                        </button>
                      </div>
                      {errors.category && <p className="text-sm text-red-500 mt-1">{errors.category}</p>}
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
                                  ref={firstInvalidBankKey === "initialDepositBank" ? firstInvalidBankRef : null}
                                  type="button"
                                  onClick={() => { setBankModalFor("initial"); setBankModalOpen(true); }}
                                  disabled={isSavedRecord}
                                  className={clsx("btn-secondary flex-1", errors.initialDepositBank && "border-red-500 focus:border-red-500 focus:ring-red-200")}
                                >
                                  {form.initialDepositBankName || "Select Bank"}
                                </button>
                              </div>
                              {errors.initialDepositBank && (
                                <p className="text-sm text-red-500 mt-1">{errors.initialDepositBank}</p>
                              )}
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
                          (form.extraInstallments || []).map((row, idx) => {
                            const rowIsSaved = isSavedRecord && idx < savedExtraInstallmentsCount;
                            return (
                            <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 rounded-xl border border-gray-100 bg-gray-50/50 items-end">
                              <div className="md:col-span-2">
                                <label className="label text-xs">Date</label>
                                <input
                                  type="date"
                                  readOnly={rowIsSaved}
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
                                  readOnly={rowIsSaved}
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
                                  ref={firstInvalidBankKey === `installmentBank_${idx}` ? firstInvalidBankRef : null}
                                  type="button"
                                  disabled={rowIsSaved}
                                  onClick={() => { setBankModalFor({ type: "installment", index: idx }); setBankModalOpen(true); }}
                                  className={clsx("input w-full text-left truncate bg-white", errors[`installmentBank_${idx}`] && "border-red-500 focus:border-red-500 focus:ring-red-200")}
                                >
                                  {row.bankName || "Select Bank"}
                                </button>
                                {errors[`installmentBank_${idx}`] && (
                                  <p className="text-sm text-red-500 mt-1">{errors[`installmentBank_${idx}`]}</p>
                                )}
                              </div>
                              <div className="md:col-span-3">
                                <label className="label text-xs">Note</label>
                                <input
                                  type="text"
                                  readOnly={rowIsSaved}
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
                                {!rowIsSaved && (
                                  <button type="button" onClick={() => setForm({ ...form, extraInstallments: (form.extraInstallments || []).filter((_, i) => i !== idx) })} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                            );
                          })
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
                              setErrors((prev) => {
                                const next = { ...prev };
                                delete next.initialDepositBank;
                                return next;
                              });
                            } else if (bankModalFor && bankModalFor.type === "installment" && typeof bankModalFor.index === "number") {
                              const idx = bankModalFor.index;
                              const next = [...(form.extraInstallments || [])];
                              next[idx] = { ...next[idx], bankAccountId: b.id, bankName: name };
                              setForm((prev) => ({ ...prev, extraInstallments: next }));
                              setErrors((prev) => {
                                const nextErr = { ...prev };
                                delete nextErr[`installmentBank_${idx}`];
                                return nextErr;
                              });
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

            {/* Add New Category Modal */}
            {addCategoryModalOpen && (
              <div className="absolute inset-0 bg-slate-900/60 z-10 flex items-center justify-center p-4 rounded-2xl">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col">
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800">Add New Category</h3>
                    <button type="button" onClick={() => { setAddCategoryModalOpen(false); setNewCategoryName(""); }} className="p-2 text-slate-400 hover:text-slate-600 rounded-full">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-4 space-y-4">
                    <div>
                      <label className="label">Category name</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="Enter category name"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="p-4 border-t border-gray-100 flex justify-end gap-2">
                    <button type="button" onClick={() => { setAddCategoryModalOpen(false); setNewCategoryName(""); }} className="btn-secondary">Cancel</button>
                    <button
                      type="button"
                      disabled={!newCategoryName.trim() || addCategorySaving}
                      className="btn-primary"
                      onClick={async () => {
                        const name = newCategoryName.trim();
                        if (!name) return;
                        setAddCategorySaving(true);
                        try {
                          const created = await createIncomeCategory(name);
                          const list = await getIncomeCategories();
                          setIncomeCategories(list);
                          setForm((prev) => ({ ...prev, category: created.name }));
                          setAddCategoryModalOpen(false);
                          setNewCategoryName("");
                          toast.success("Category added");
                        } catch (e) {
                          toast.error(e.response?.data?.message || "Failed to add category");
                        } finally {
                          setAddCategorySaving(false);
                        }
                      }}
                    >
                      {addCategorySaving ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Manage Categories Modal */}
            {manageCategoriesModalOpen && (
              <div className="absolute inset-0 bg-slate-900/60 z-10 flex items-center justify-center p-4 rounded-2xl">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800">Manage Categories</h3>
                    <button type="button" onClick={() => setManageCategoriesModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="overflow-y-auto p-4 space-y-2">
                    {incomeCategories.length === 0 ? (
                      <p className="text-sm text-slate-500">No categories yet. Add one from the dropdown.</p>
                    ) : (
                      incomeCategories.map((c) => (
                        <div key={c.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/50">
                          <span className="font-medium text-slate-800">{c.name}</span>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await deleteIncomeCategory(c.id);
                                const list = await getIncomeCategories();
                                setIncomeCategories(list);
                                if (form.category === c.name) setForm((prev) => ({ ...prev, category: "" }));
                                toast.success("Category removed");
                              } catch (e) {
                                toast.error(e.response?.data?.message || "Failed to delete");
                              }
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
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
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className={clsx("btn-primary flex items-center gap-2", isSaving && "opacity-50 cursor-not-allowed")}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Record"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
