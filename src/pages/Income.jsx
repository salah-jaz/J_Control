import { useEffect, useState, useRef, useMemo } from "react";
import { 
  Eye, Edit2, Trash2, Plus, Download, Search, X, Check, Landmark, Wallet, 
  TrendingUp, AlertCircle, Receipt, Loader2, Save, Layers, User, Target, 
  Building2, Calendar as CalendarIcon, Phone, Mail, BadgeCheck, Activity, 
  Briefcase, Filter, MessageSquare, CreditCard, Banknote, CheckCircle2,
  ChevronDown, ChevronRight
} from "lucide-react";
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
import PageHeader from "../components/ui/PageHeader";
import ToolbarSearch from "../components/ui/ToolbarSearch";
import EmptyState from "../components/ui/EmptyState";
import { FilterSelect, ClearFiltersButton } from "../components/ui/FilterControls";
import { TableSectionHeader, TablePagination } from "../components/ui/DataTableSection";
import { ActionIconButton } from "../components/ui/TableRowActions";

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

const SectionHeader = ({ icon: Icon, title, color }) => {
  const colors = {
    blue: "from-blue-600 to-cyan-500 shadow-blue-500/20",
    indigo: "from-indigo-600 to-blue-500 shadow-indigo-500/20",
    violet: "from-violet-600 to-purple-500 shadow-violet-500/20",
    fuchsia: "from-fuchsia-600 to-pink-500 shadow-fuchsia-500/20",
    rose: "from-rose-600 to-pink-500 shadow-rose-500/20",
    amber: "from-amber-500 to-orange-400 shadow-amber-500/20"
  };
  
  return (
    <div className="flex flex-col gap-1.5 border-b border-slate-100 pb-4">
      <div className="flex items-center gap-3">
        <div className={clsx("h-8 w-8 rounded-lg bg-gradient-to-br flex items-center justify-center text-white shadow-lg", colors[color] || colors.blue)}>
          <Icon size={16} className="stroke-[2.5]" />
        </div>
        <h4 className="text-[14px] font-bold text-slate-900 uppercase tracking-widest leading-none">
          {title}
        </h4>
      </div>
    </div>
  );
};

const Label = ({ text, required }) => (
  <label className="text-[13px] font-bold text-slate-700 ml-0.5 flex items-center gap-1">
    {text}
    {required && <span className="text-rose-500 font-black">*</span>}
  </label>
);

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
  const [clientFilter, setClientFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

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
    } else if (dateFrom || dateTo) {
      date_from = dateFrom || undefined;
      date_to = dateTo || undefined;
    }
    return {
      search: searchDebounced.trim() || undefined,
      status: statusFilter === "All" ? undefined : statusFilter,
      category: categoryFilter || undefined,
      bank_account_id: bankFilter || undefined,
      client: clientFilter || undefined,
      date_from,
      date_to,
      page: currentPage,
      per_page: 20,
    };
  }, [searchDebounced, statusFilter, categoryFilter, bankFilter, clientFilter, dateFilter, dateFrom, dateTo, currentPage]);

  const { data: incomeResult, isLoading: incomeLoading } = useIncomeList(filters);

  // Build summary filters (same as list filters but without pagination)
  const summaryFilters = useMemo(() => {
    const { page: _p, per_page: _pp, ...rest } = filters;
    return rest;
  }, [filters]);

  const { data: incomeSummaryFromQuery } = useIncomeSummary(summaryFilters);
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
  }, [searchDebounced, statusFilter, categoryFilter, bankFilter, clientFilter, dateFilter, dateFrom, dateTo]);

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
        // Normalize snake_case keys from backend to camelCase for the frontend UI
        const backendErrors = e.response.data.errors;
        const normalizedErrors = {};
        
        Object.keys(backendErrors).forEach(key => {
          const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
          normalizedErrors[camelKey] = Array.isArray(backendErrors[key]) 
            ? backendErrors[key][0] 
            : backendErrors[key];
        });
        
        setErrors(normalizedErrors);
        toast.error("Server validation failed. Please check the form.");
      } else {
        const msg = e.response?.data?.message || e.message || "Unknown error";
        toast.error("Failed to save record: " + msg);
      }
    }
  };

  const inputClass = (f) => `input ${errors[f] ? "border-red-500 focus:border-red-500 focus:ring-red-200" : ""}`;

  const Req = () => <span className="text-red-500 ml-1 font-bold">*</span>;

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
          color,
          "bg-opacity-10",
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

  const displayStatus = (status) => {
    if (status === "Fully Paid") return "Paid";
    if (status === "Partially Paid") return "Partial";
    return status || "—";
  };

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto animate-fade-in space-y-6 md:space-y-8">
      {/* HEADER */}
      <PageHeader
        title="Income Records"
        subtitle="Track and manage your incoming payments."
        primaryAction={(
          <button
            onClick={openAdd}
            className="btn-primary group relative flex items-center gap-2 overflow-hidden shadow-[0_8px_20px_rgba(124,58,237,0.25)]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer transition-none" />
            <Plus size={20} className="relative z-10" />
            <span className="relative z-10">Add Income</span>
          </button>
        )}
      />

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

      {/* Filters Bar */}
      <div className="space-y-3">
        <div className="bg-white/70 backdrop-blur-xl px-4 py-3 rounded-lg border border-slate-100 shadow-xl shadow-slate-200/20 flex flex-wrap items-center gap-3">
          <ToolbarSearch
            placeholder="Search income by ID, invoice, or description..."
            value={searchQuery}
            onChange={setSearchQuery}
          />
          
          <div className="flex items-center gap-2">
            <FilterSelect icon={Receipt} value={statusFilter} onChange={setStatusFilter}>
                <option value="All">All Status</option>
                <option value="Paid">Paid</option>
                <option value="Partial">Partial</option>
                <option value="Unpaid">Unpaid</option>
            </FilterSelect>

            <FilterSelect icon={CalendarIcon} value={dateFilter} onChange={setDateFilter}>
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

            {(searchQuery || statusFilter !== "All" || categoryFilter || bankFilter || clientFilter || dateFilter !== "All" || dateFrom || dateTo) && (
              <ClearFiltersButton
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("All");
                  setCategoryFilter("");
                  setBankFilter("");
                  setClientFilter("");
                  setDateFilter("All");
                  setDateFrom("");
                  setDateTo("");
                }}
              />
            )}
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="bg-slate-50/50 p-4 rounded-lg border border-slate-100 flex flex-wrap items-center gap-4 animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-1.5 px-3.5 bg-white rounded-lg border border-slate-200 hover:border-brand-300 transition-all cursor-pointer group shadow-sm h-10 min-w-[180px]">
              <Check className="h-3.5 w-3.5 text-slate-500 group-hover:text-brand-500" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-transparent text-[13px] py-1.5 font-medium text-slate-700 outline-none cursor-pointer w-full"
              >
                <option value="">All Categories</option>
                {incomeCategories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 px-3.5 bg-white rounded-lg border border-slate-200 hover:border-brand-300 transition-all cursor-pointer group shadow-sm h-10 min-w-[200px]">
              <Landmark className="h-3.5 w-3.5 text-slate-500 group-hover:text-brand-500" />
              <select
                value={bankFilter}
                onChange={(e) => setBankFilter(e.target.value)}
                className="bg-transparent text-[13px] py-1.5 font-medium text-slate-700 outline-none cursor-pointer w-full"
              >
                <option value="">All Banks</option>
                {bankAccounts.map((b) => (
                  <option key={b.id} value={b.id}>{b.bankName}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 px-3.5 bg-white rounded-lg border border-slate-200 hover:border-brand-300 transition-all cursor-pointer group shadow-sm h-10 min-w-[200px]">
              <Wallet className="h-3.5 w-3.5 text-slate-500 group-hover:text-brand-500" />
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

            {(dateFilter === "All" || dateFilter === "") && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-2">Period:</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[13px] font-medium text-slate-600 outline-none focus:border-brand-400 h-10 shadow-sm"
                />
                <span className="text-slate-400 text-xs font-bold px-1">-</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[13px] font-medium text-slate-600 outline-none focus:border-brand-400 h-10 shadow-sm"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* TABLE */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-4 md:px-6 md:py-5 border-b border-gray-100 flex flex-col lg:flex-row justify-between items-start lg:items-center bg-gray-50/50 gap-4">
          <TableSectionHeader
            title="Income Records"
            summary={incomeLoading ? "Loading..." : incomeMeta
              ? `Showing ${(incomeMeta.current_page - 1) * incomeMeta.per_page + 1}–${Math.min(incomeMeta.current_page * incomeMeta.per_page, incomeMeta.total)} of ${incomeMeta.total}`
              : `Showing ${incomeRecords.length} of ${incomeRecords.length}`}
          />
          <div className="flex flex-wrap gap-2 w-full lg:w-auto">
            <button
              onClick={() => exportToCSV(incomeRecords.map((r) => ({ id: r.id, client: r.client, amount: r.netAmount || r.amount, method: r.method, date: r.receivedDate, bank: r.bank, status: r.status })), "income_records")}
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
            <thead className="bg-slate-50/80 text-[13px] font-semibold text-slate-600 capitalize tracking-normal border-b border-gray-100">
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
                  <td colSpan="7" className="px-6 py-2">
                    <EmptyState
                      icon={Receipt}
                      title="No income records found"
                      description="Add an income record or adjust your filters."
                    />
                  </td>
                </tr>
              ) : (
                incomeRecords.map((income) => (
                  <tr key={income.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-600">{income.id}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{income.client || "-"}</td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900 font-mono">
                      ₹{parseFloat(income.netAmount || income.amount || 0).toLocaleString("en-IN")}
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
                        <ActionIconButton onClick={() => openViewModal(income)} title="View" icon={Eye} tone="view" />
                        {!income.invoice_id && (
                          <>
                            <ActionIconButton onClick={() => openEdit(income)} title="Edit" icon={Edit2} tone="edit" />
                            <ActionIconButton onClick={() => handleDelete(income.id)} title="Delete" icon={Trash2} tone="delete" />
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
          <TablePagination
            summary={`Showing ${(incomeMeta.current_page - 1) * incomeMeta.per_page + 1}–${Math.min(incomeMeta.current_page * incomeMeta.per_page, incomeMeta.total)} of ${incomeMeta.total}`}
            onPrevious={() => setCurrentPage((p) => Math.max(1, p - 1))}
            onNext={() => setCurrentPage((p) => p + 1)}
            previousDisabled={incomeMeta.current_page <= 1}
            nextDisabled={incomeMeta.current_page >= incomeMeta.last_page}
          />
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
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-6xl rounded-t-[32px] sm:rounded-[24px] shadow-2xl flex flex-col max-h-[96vh] border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-[0.98] duration-300">

            {/* Header */}
            <div className="flex items-center justify-between px-8 pt-8 pb-6 shrink-0">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="h-9 w-9 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/30">
                    <TrendingUp size={18} className="text-white" />
                  </div>
                  <h2 className="text-[22px] font-extrabold text-slate-900 tracking-tight">
                    {editId ? 'Edit Income Entry' : 'New Income Entry'}
                  </h2>
                </div>
                <p className="text-[13.5px] text-slate-400 font-medium ml-12">Fill in the details for this transaction.</p>
              </div>
              <button onClick={() => setOpenForm(false)} className="h-9 w-9 bg-slate-100 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full flex items-center justify-center transition-all active:scale-90">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Sidebar Tabs */}
              <aside className="w-64 border-r border-slate-100 bg-slate-50/70 p-4 shrink-0 overflow-y-auto custom-scrollbar">
                {[
                  { id:'basic',label:'Basic',desc:'Client & amount',icon:User },
                  { id:'financial',label:'Payment',desc:'Method & status',icon:Wallet },
                  { id:'installments',label:'Installments',desc:'Split receipts',icon:Layers },
                  { id:'internal',label:'Internal',desc:'Ops notes',icon:Briefcase },
                ].map((step, idx) => {
                  const order = ['basic','financial','installments','internal'];
                  const isActive = step.id === tab;
                  const isDone = order.indexOf(tab) > idx;
                  const StepIcon = step.icon;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => setTab(step.id)}
                      className={clsx(
                        "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all border mb-1.5",
                        isActive
                          ? "bg-white border-brand-200 text-brand-700 shadow-sm"
                          : "border-transparent text-slate-500 hover:bg-white hover:border-slate-200"
                      )}
                    >
                      <div className={clsx(
                        "h-9 w-9 rounded-lg flex items-center justify-center transition-all",
                        isActive
                          ? "bg-brand-600 text-white shadow-md shadow-brand-500/25"
                          : isDone
                            ? "bg-emerald-500 text-white"
                            : "bg-slate-200 text-slate-500"
                      )}>
                        {isDone ? <Check size={16} /> : <StepIcon size={16} />}
                      </div>
                      <div>
                        <p className={clsx("text-[13px] font-bold leading-tight", isActive ? "text-brand-700" : isDone ? "text-emerald-700" : "text-slate-700")}>
                          {step.label}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{step.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </aside>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-8 pb-4 pt-2 custom-scrollbar">

              {tab==='basic'&&(
                <div className="space-y-5 animate-in fade-in slide-in-from-right-3 duration-300">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1">
                      <label className="text-[13px] font-semibold text-slate-700 flex items-center gap-1">Client <span className="text-rose-500 text-[11px] font-black">required</span></label>
                      <div className="relative">
                        <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"/>
                        <select className={clsx("w-full pl-10 pr-10 py-3 bg-white border rounded-xl text-[14px] font-semibold text-slate-800 outline-none transition-all appearance-none",errors.client?"border-rose-300 ring-2 ring-rose-100":"border-slate-200 hover:border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15")} value={form.client} onChange={(e)=>setForm({...form,client:e.target.value})}>
                          <option value="">Select Client</option>
                          {clients.map(c=><option key={c.id} value={c.company_name||c.client_name}>{c.company_name||c.client_name}</option>)}
                        </select>
                        <ChevronDown size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"/>
                      </div>
                      {errors.client&&<p className="text-[11.5px] text-rose-500 flex items-center gap-1"><AlertCircle size={11}/> {errors.client}</p>}
                    </div>
                    <div className="space-y-1">
                      <label className="text-[13px] font-semibold text-slate-700 flex items-center gap-1">Income Source <span className="text-rose-500 text-[11px] font-black">required</span></label>
                      <input className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] font-semibold text-slate-800 placeholder:text-slate-300 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-all" placeholder="e.g. Consulting" value={form.source} onChange={(e)=>setForm({...form,source:e.target.value})}/>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[13px] font-semibold text-slate-700">Project / Service</label>
                      <input className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] font-semibold text-slate-800 placeholder:text-slate-300 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-all" placeholder="e.g. Website Redesign" value={form.project} onChange={(e)=>setForm({...form,project:e.target.value})}/>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[13px] font-semibold text-slate-700">Category</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <select className={clsx("w-full px-4 py-3 bg-white border rounded-xl text-[14px] font-semibold text-slate-800 outline-none transition-all appearance-none",errors.category?"border-rose-300":"border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15")} value={form.category} onChange={(e)=>{if(e.target.value==='__add__')return setAddCategoryModalOpen(true);if(e.target.value==='__manage__')return setManageCategoriesModalOpen(true);setForm({...form,category:e.target.value});}}>
                            <option value="">Select category</option>
                            {incomeCategories.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
                            <option value="__add__">+ Add New</option>
                            <option value="__manage__">Manage List</option>
                          </select>
                          <ChevronDown size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"/>
                        </div>
                        <button type="button" onClick={()=>setAddCategoryModalOpen(true)} className="h-[46px] w-[46px] bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl flex items-center justify-center transition-all active:scale-95"><Plus size={18}/></button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[13px] font-semibold text-slate-700">Invoice No</label>
                      <input className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] font-semibold text-slate-800 placeholder:text-slate-300 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-all" placeholder="—" value={form.invoiceNo} onChange={(e)=>setForm({...form,invoiceNo:e.target.value})}/>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[13px] font-semibold text-slate-700 flex items-center gap-1">Base Amount (₹) <span className="text-rose-500 text-[11px] font-black">required</span></label>
                      <input type="number" step="0.01" className={clsx("w-full px-4 py-3 bg-white border rounded-xl text-[14px] font-bold text-slate-800 placeholder:text-slate-300 outline-none transition-all",errors.amount?"border-rose-300 ring-2 ring-rose-100":"border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15")} placeholder="0.00" value={form.amount} onChange={(e)=>setForm({...form,amount:e.target.value})}/>
                      {errors.amount&&<p className="text-[11.5px] text-rose-500 flex items-center gap-1"><AlertCircle size={11}/> {errors.amount}</p>}
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[13px] font-semibold text-slate-700">Description</label>
                      <textarea className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] font-medium text-slate-800 placeholder:text-slate-300 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-all min-h-[80px] resize-none" placeholder="Detailed description of the income" value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})}/>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[13px] font-semibold text-slate-700">Reference Number</label>
                      <input className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] font-semibold text-slate-800 placeholder:text-slate-300 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-all" placeholder="Internal reference or PO number" value={form.referenceNumber} onChange={(e)=>setForm({...form,referenceNumber:e.target.value})}/>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[13px] font-semibold text-slate-700">Invoice Date</label>
                      <div className="relative">
                        <CalendarIcon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"/>
                        <input type="date" className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] font-semibold text-slate-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-all" value={form.invoiceDate} onChange={(e)=>setForm({...form,invoiceDate:e.target.value})}/>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[13px] font-semibold text-slate-700">Client Email</label>
                      <div className="relative">
                        <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"/>
                        <input type="email" className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] font-semibold text-slate-800 placeholder:text-slate-300 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-all" placeholder="client@email.com" value={form.clientEmail} onChange={(e)=>setForm({...form,clientEmail:e.target.value})}/>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[13px] font-semibold text-slate-700">Client Phone</label>
                      <div className="relative">
                        <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"/>
                        <input className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] font-semibold text-slate-800 placeholder:text-slate-300 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-all" placeholder="Phone number" value={form.clientPhone} onChange={(e)=>setForm({...form,clientPhone:e.target.value})}/>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button type="button" onClick={()=>setTab('financial')} className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white text-[13.5px] font-bold rounded-xl hover:bg-brand-700 transition-all active:scale-95 shadow-lg shadow-brand-500/20">Next: Payment <ChevronRight size={16}/></button>
                  </div>
                </div>
              )}

              {tab==='financial'&&(
                <div className="space-y-5 animate-in fade-in slide-in-from-right-3 duration-300">
                  <div className="bg-slate-900 rounded-2xl p-5 text-white space-y-2">
                    <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">Revenue Summary</h4>
                    <div className="flex justify-between text-[13px] text-slate-400"><span>Base Amount</span><span className="text-white font-semibold">₹{Number(form.amount||0).toLocaleString()}</span></div>
                    {parseFloat(form.discount)>0&&<div className="flex justify-between text-[13px] text-emerald-400"><span>Discount</span><span>- ₹{parseFloat(form.discount).toLocaleString()}</span></div>}
                    {parseFloat(form.taxAmount)>0&&<div className="flex justify-between text-[13px] text-slate-400"><span>Tax</span><span className="text-white">+ ₹{parseFloat(form.taxAmount).toLocaleString()}</span></div>}
                    <div className="flex justify-between text-[18px] font-black pt-2 border-t border-slate-700"><span>Total</span><span className="text-brand-400">₹{totalAmount.toLocaleString()}</span></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1">
                      <label className="text-[13px] font-semibold text-slate-700">Discount (₹)</label>
                      <input type="number" step="0.01" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] font-semibold text-slate-800 placeholder:text-slate-300 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-all" placeholder="0.00" value={form.discount} onChange={(e)=>setForm({...form,discount:e.target.value})}/>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[13px] font-semibold text-slate-700">Tax Amount (₹)</label>
                      <input type="number" step="0.01" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] font-semibold text-slate-800 placeholder:text-slate-300 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-all" placeholder="0.00" value={form.taxAmount} onChange={(e)=>setForm({...form,taxAmount:e.target.value})}/>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[13px] font-semibold text-slate-700">Payment Method</label>
                      <div className="relative">
                        <select className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] font-semibold text-slate-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-all appearance-none" value={form.method} onChange={(e)=>setForm({...form,method:e.target.value})}>
                          {['Bank Transfer','UPI','Cash','Cheque','Card','Other'].map(m=><option key={m}>{m}</option>)}
                        </select>
                        <ChevronDown size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"/>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[13px] font-semibold text-slate-700">Status</label>
                      <div className="relative">
                        <select className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] font-semibold text-slate-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-all appearance-none" value={form.status} onChange={(e)=>setForm({...form,status:e.target.value})}>
                          {['Received','Pending','Partial','Overdue'].map(s=><option key={s}>{s}</option>)}
                        </select>
                        <ChevronDown size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"/>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[13px] font-semibold text-slate-700">Transaction ID</label>
                      <input className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] font-semibold text-slate-800 placeholder:text-slate-300 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-all" placeholder="UTR / Ref number" value={form.transactionId} onChange={(e)=>setForm({...form,transactionId:e.target.value})}/>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[13px] font-semibold text-slate-700">Received Date</label>
                      <div className="relative">
                        <CalendarIcon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"/>
                        <input type="date" className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] font-semibold text-slate-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-all" value={form.receivedDate} onChange={(e)=>setForm({...form,receivedDate:e.target.value})}/>
                      </div>
                    </div>
                  </div>
                  <div onClick={()=>setForm({...form,initialDepositEnabled:!form.initialDepositEnabled})} className={clsx("flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all",form.initialDepositEnabled?"bg-brand-50 border-brand-200":"bg-slate-50 border-slate-100 hover:border-slate-200")}>
                    <div className={clsx("h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0",form.initialDepositEnabled?"bg-brand-600 border-brand-600":"bg-white border-slate-300")}>
                      {form.initialDepositEnabled&&<Check size={14} className="text-white"/>}
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-slate-800">Client paid an advance / deposit</p>
                      <p className="text-[12px] text-slate-400 font-medium">Record an upfront partial payment</p>
                    </div>
                  </div>
                  {form.initialDepositEnabled&&(
                    <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-brand-200 ml-3 animate-in slide-in-from-top-2 duration-200">
                      <div className="space-y-1">
                        <label className="text-[13px] font-semibold text-slate-700">Advance Amount (₹)</label>
                        <input type="number" step="0.01" readOnly={editId&&savedExtraInstallmentsCount>0} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] font-bold text-slate-800 placeholder:text-slate-300 outline-none focus:border-brand-500 transition-all" placeholder="0.00" value={form.initialDepositAmount} onChange={(e)=>setForm({...form,initialDepositAmount:e.target.value})}/>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[13px] font-semibold text-slate-700">Received In</label>
                        <button type="button" disabled={editId&&savedExtraInstallmentsCount>0} onClick={()=>{setBankModalFor('initial');setBankModalOpen(true);}} className={clsx("w-full px-4 py-3 bg-white border rounded-xl text-[14px] font-semibold text-left flex items-center justify-between transition-all",errors.initialDepositBank?"border-rose-300":"border-slate-200 hover:border-slate-300")}>
                          <span className={form.initialDepositBankName?'text-slate-800':'text-slate-300'}>{form.initialDepositBankName||'Select bank account…'}</span>
                          <Landmark size={15} className="text-slate-300"/>
                        </button>
                        {errors.initialDepositBank&&<p className="text-[11.5px] text-rose-500">{errors.initialDepositBank}</p>}
                      </div>
                    </div>
                  )}
                  {form.initialDepositEnabled&&parseFloat(form.initialDepositAmount)>0&&(
                    <div className="flex items-center justify-between px-5 py-3 bg-amber-50 border border-amber-200 rounded-2xl">
                      <span className="text-[13px] font-bold text-amber-700">Balance Due After Advance</span>
                      <span className="text-[18px] font-extrabold text-amber-600">₹{Math.max(0,balanceDue).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2">
                    <button type="button" onClick={()=>setTab('basic')} className="flex items-center gap-1.5 px-5 py-2.5 text-slate-500 hover:text-slate-700 text-[13.5px] font-bold transition-all">← Back</button>
                    <button type="button" onClick={()=>setTab('installments')} className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white text-[13.5px] font-bold rounded-xl hover:bg-brand-700 transition-all active:scale-95 shadow-lg shadow-brand-500/20">Next: Installments <ChevronRight size={16}/></button>
                  </div>
                </div>
              )}

              {tab==='installments'&&(
                <div className="space-y-5 animate-in fade-in slide-in-from-right-3 duration-300">
                  <p className="text-[13px] text-slate-500 font-medium">Track additional payment installments for this income record.</p>
                  <div className="space-y-3">
                    {(!form.extraInstallments||form.extraInstallments.length===0)?(
                      <div className="py-16 flex flex-col items-center justify-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                        <div className="h-14 w-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-300 mb-3"><Layers size={28}/></div>
                        <p className="text-[14px] font-medium text-slate-400">No installments added yet.</p>
                      </div>
                    ):form.extraInstallments.map((row,idx)=>{
                      const rowIsSaved=editId&&idx<savedExtraInstallmentsCount;
                      return(
                        <div key={idx} className={clsx("flex items-center gap-3 group rounded-2xl px-4 py-3 border transition-all",rowIsSaved?"bg-slate-50 border-slate-100 opacity-70":"bg-white border-slate-200 hover:border-slate-300")}>
                          <span className="text-[12px] font-black text-slate-300 w-5 shrink-0 text-center">{idx+1}</span>
                          <div className="relative shrink-0">
                            <CalendarIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"/>
                            <input type="date" readOnly={rowIsSaved} className="w-36 pl-9 pr-3 py-2.5 bg-transparent border border-slate-200 rounded-xl text-[13px] font-semibold text-slate-700 outline-none focus:border-brand-400" value={row.date} onChange={(e)=>{const n=[...form.extraInstallments];n[idx].date=e.target.value;setForm({...form,extraInstallments:n});}}/>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[13px] font-bold text-slate-400">₹</span>
                            <input type="number" readOnly={rowIsSaved} className="w-28 bg-transparent border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] font-black text-slate-900 outline-none focus:border-brand-400" placeholder="0.00" value={row.amount} onChange={(e)=>{const n=[...form.extraInstallments];n[idx].amount=e.target.value;setForm({...form,extraInstallments:n});}}/>
                          </div>
                          <button type="button" disabled={rowIsSaved} onClick={()=>{setBankModalFor({type:'installment',index:idx});setBankModalOpen(true);}} className={clsx("flex-1 px-3 py-2.5 bg-white border rounded-xl text-[12px] font-semibold text-left truncate transition-all",errors[`installmentBank_${idx}`]?"border-rose-300":"border-slate-200 hover:border-slate-300")}>
                            {row.bankName||<span className="text-slate-300">Select bank…</span>}
                          </button>
                          <input type="text" readOnly={rowIsSaved} className="w-28 bg-transparent border border-slate-200 rounded-xl px-3 py-2.5 text-[12px] font-medium text-slate-600 placeholder:text-slate-300 outline-none focus:border-brand-400" placeholder="Note…" value={row.note} onChange={(e)=>{const n=[...form.extraInstallments];n[idx].note=e.target.value;setForm({...form,extraInstallments:n});}}/>
                          {!rowIsSaved&&<button type="button" onClick={()=>setForm({...form,extraInstallments:form.extraInstallments.filter((_,i)=>i!==idx)})} className="h-8 w-8 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>}
                        </div>
                      );
                    })}
                  </div>
                  <button type="button" onClick={()=>setForm({...form,extraInstallments:[...(form.extraInstallments||[]),{date:'',amount:'',bankAccountId:null,bankName:'',note:''}]})} className="flex items-center gap-2 text-[13px] font-bold text-brand-600 hover:text-brand-700 px-4 py-2 hover:bg-brand-50 rounded-xl transition-all active:scale-95">
                    <Plus size={16}/> Add Installment
                  </button>
                  <div className="flex justify-between pt-2">
                    <button type="button" onClick={()=>setTab('financial')} className="flex items-center gap-1.5 px-5 py-2.5 text-slate-500 hover:text-slate-700 text-[13.5px] font-bold transition-all">← Back</button>
                    <button type="button" onClick={()=>setTab('internal')} className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white text-[13.5px] font-bold rounded-xl hover:bg-brand-700 transition-all active:scale-95 shadow-lg shadow-brand-500/20">Next: Internal <ChevronRight size={16}/></button>
                  </div>
                </div>
              )}

              {tab==='internal'&&(
                <div className="space-y-5 animate-in fade-in slide-in-from-right-3 duration-300">
                  <p className="text-[13px] text-slate-500 font-medium">Internal details for staff, audit, and follow-up tracking.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1">
                      <label className="text-[13px] font-semibold text-slate-700">Assigned Staff</label>
                      <div className="relative">
                        <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"/>
                        <input className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] font-semibold text-slate-800 placeholder:text-slate-300 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-all" placeholder="Lead agent" value={form.staff} onChange={(e)=>setForm({...form,staff:e.target.value})}/>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[13px] font-semibold text-slate-700">Department</label>
                      <input className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] font-semibold text-slate-800 placeholder:text-slate-300 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-all" placeholder="Sales / Ops / Treasury" value={form.department} onChange={(e)=>setForm({...form,department:e.target.value})}/>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[13px] font-semibold text-slate-700">Payment Status</label>
                      <div className="relative">
                        <select className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] font-semibold text-slate-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-all appearance-none" value={form.collectionStatus} onChange={(e)=>setForm({...form,collectionStatus:e.target.value})}>
                          {['Collected','Overdue','Partially Paid','Written Off'].map(s=><option key={s}>{s}</option>)}
                        </select>
                        <ChevronDown size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"/>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[13px] font-semibold text-slate-700">Commission (₹)</label>
                      <input type="number" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] font-semibold text-slate-800 placeholder:text-slate-300 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-all" placeholder="0.00" value={form.commission} onChange={(e)=>setForm({...form,commission:e.target.value})}/>
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[13px] font-semibold text-slate-700">Internal Notes</label>
                      <textarea className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] font-medium text-slate-800 placeholder:text-slate-300 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-all min-h-[80px] resize-none" placeholder="Restricted notes for internal audit only…" value={form.notes} onChange={(e)=>setForm({...form,notes:e.target.value})}/>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[13px] font-semibold text-slate-700">Follow-up Date</label>
                      <div className="relative">
                        <CalendarIcon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"/>
                        <input type="date" className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] font-semibold text-slate-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-all" value={form.followUpDate} onChange={(e)=>setForm({...form,followUpDate:e.target.value})}/>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-start pt-2">
                    <button type="button" onClick={()=>setTab('installments')} className="flex items-center gap-1.5 px-5 py-2.5 text-slate-500 hover:text-slate-700 text-[13.5px] font-bold transition-all">← Back</button>
                  </div>
                </div>
              )}
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">Total Inflow</span>
                <span className="text-[22px] font-black text-slate-900 leading-tight">₹{totalAmount.toLocaleString()}</span>
                {form.initialDepositEnabled&&parseFloat(form.initialDepositAmount)>0&&(
                  <span className="text-[11px] text-slate-400 font-medium">Balance: ₹{Math.max(0,balanceDue).toLocaleString()}</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={()=>setOpenForm(false)} className="px-6 py-3 bg-white border border-slate-200 text-slate-600 text-[14px] font-bold rounded-xl hover:bg-slate-50 transition-all active:scale-95">Cancel</button>
                <button type="button" onClick={handleSave} disabled={isSaving} className="flex items-center gap-2.5 px-8 py-3 bg-brand-600 hover:bg-brand-700 text-white text-[14px] font-extrabold rounded-xl shadow-xl shadow-brand-500/25 hover:shadow-brand-500/40 transition-all active:scale-95 disabled:opacity-60">
                  {isSaving?<Loader2 size={18} className="animate-spin"/>:<Save size={18}/>}
                  {isSaving?'Saving…':editId?'Save Changes':'Save Record'}
                </button>
              </div>
            </div>

            {/* Nested Modals: Bank, Category Add/Manage */}
            {bankModalOpen && (
              <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-in zoom-in-[0.95] duration-200">
                  <div className="px-6 py-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-[16px] font-bold text-slate-800">Assign Treasury Channel</h3>
                    <button onClick={() => { setBankModalOpen(false); setBankModalFor(null); }} className="h-8 w-8 text-slate-400 hover:text-rose-500 transition-colors">
                      <X size={18} />
                    </button>
                  </div>
                  <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {bankAccounts.length === 0 ? (
                      <div className="p-12 text-center text-slate-400 text-[14px]">No reserve vaults found.</div>
                    ) : (
                      bankAccounts.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => {
                            const name = `${b.bankName} – ${b.accountNumber}`;
                            if (bankModalFor === "initial") {
                              setForm((prev) => ({ ...prev, initialDepositBankId: b.id, initialDepositBankName: name }));
                              setErrors((prev) => { const n = { ...prev }; delete n.initialDepositBank; return n; });
                            } else if (bankModalFor?.type === "installment") {
                              const next = [...form.extraInstallments];
                              next[bankModalFor.index] = { ...next[bankModalFor.index], bankAccountId: b.id, bankName: name };
                              setForm((prev) => ({ ...prev, extraInstallments: next }));
                              setErrors((prev) => { const n = { ...prev }; delete n[`installmentBank_${bankModalFor.index}`]; return n; });
                            }
                            setBankModalOpen(false);
                            setBankModalFor(null);
                          }}
                          className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-100 hover:border-violet-200 hover:bg-violet-50/50 text-left transition-all group"
                        >
                          <div className="h-10 w-10 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center group-hover:bg-violet-100 group-hover:text-violet-600 transition-colors">
                            <Landmark size={20} />
                          </div>
                          <div>
                            <p className="text-[14px] font-bold text-slate-800 tracking-tight">{b.bankName}</p>
                            <p className="text-[12px] font-medium text-slate-400 font-mono italic">Account: {b.accountNumber}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {addCategoryModalOpen && (
              <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200">
                 <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100 animate-in zoom-in-[0.95] duration-200">
                    <div className="px-6 py-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                       <h3 className="text-[16px] font-bold text-slate-800">New Logic Classification</h3>
                       <button onClick={() => setAddCategoryModalOpen(false)} className="h-8 w-8 text-slate-400 hover:text-rose-500 transition-colors">
                          <X size={18} />
                       </button>
                    </div>
                    <div className="p-6 space-y-4">
                       <div className="space-y-1.5">
                          <Label text="Classification Name" />
                          <input type="text" className="input-premium" placeholder="e.g. Asset Liquidation" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
                       </div>
                       <button 
                         onClick={async () => {
                            const name = newCategoryName.trim();
                            if (!name) return;
                            setAddCategorySaving(true);
                            try {
                              const created = await createIncomeCategory(name);
                              const list = await getIncomeCategories();
                              setIncomeCategories(list);
                              setForm(prev => ({ ...prev, category: created.name }));
                              setAddCategoryModalOpen(false);
                              setNewCategoryName("");
                              toast.success("Logic channel established");
                            } catch (e) {
                              toast.error(e.response?.data?.message || "Protocol Failure");
                            } finally { setAddCategorySaving(false); }
                         }}
                         disabled={!newCategoryName.trim() || addCategorySaving}
                         className="w-full py-3 bg-violet-600 text-white rounded-xl text-[14px] font-bold shadow-lg shadow-violet-500/20 active:scale-95 transition-all disabled:opacity-50"
                       >
                         {addCategorySaving ? "Initializing Channel..." : "Establish Logic Channel"}
                       </button>
                    </div>
                 </div>
              </div>
            )}

            {manageCategoriesModalOpen && (
              <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200">
                 <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-in zoom-in-[0.95] duration-200">
                    <div className="px-6 py-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                       <h3 className="text-[16px] font-bold text-slate-800">Audit Classification Channels</h3>
                       <button onClick={() => setManageCategoriesModalOpen(false)} className="h-8 w-8 text-slate-400 hover:text-rose-500 transition-colors">
                          <X size={18} />
                       </button>
                    </div>
                    <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                       {incomeCategories.map(c => (
                         <div key={c.id} className="flex items-center justify-between p-3.5 px-5 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-violet-100 hover:bg-white transition-all">
                            <span className="text-[14px] font-bold text-slate-700">{c.name}</span>
                            <button onClick={async () => {
                               try {
                                 await deleteIncomeCategory(c.id);
                                 const list = await getIncomeCategories();
                                 setIncomeCategories(list);
                                 if (form.category === c.name) setForm(prev => ({ ...prev, category: "" }));
                                 toast.success("Classification Decommissioned");
                               } catch (e) { toast.error("Audit Constraint: Active usage detected"); }
                            }} className="h-8 w-8 text-rose-400 hover:bg-rose-50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                               <Trash2 size={16} />
                            </button>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
