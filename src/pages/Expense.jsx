import { useEffect, useState, useRef, useMemo } from "react";
import { 
  Eye, Edit2, Trash2, Plus, Download, Search, X, Check, Landmark, Wallet, 
  TrendingUp, TrendingDown, AlertCircle, Receipt, Loader2, Save, Layers, User, Target, 
  Building2, Calendar as CalendarIcon, Phone, Mail, BadgeCheck, Activity, 
  Briefcase, Filter, MessageSquare, CreditCard, Banknote, CheckCircle2,
  ShoppingCart, Truck, MapPin, ChevronDown, ChevronRight
} from "lucide-react";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { exportToCSV } from "../utils/csvExport";
import {
  createExpense,
  updateExpense,
  deleteExpense,
} from "../services/expenseService";
import { getBankAccounts } from "../services/bankAccountService";
import {
  getExpenseCategories,
  createExpenseCategory,
  deleteExpenseCategory,
} from "../services/expenseCategoryService";
import { useExpenseList, useExpenseSummary } from "../hooks/useApiQueries";
import { invalidateCache } from "../utils/apiFetch";
import { queryKeys } from "../query/queryKeys";
import { TableSkeleton } from "../components/Skeleton";
import clsx from "clsx";

const emptyForm = {
  vendor: "",
  expenseType: "",
  project: "",
  category: "",
  billNo: "",
  amount: "",
  currency: "INR",
  method: "Other",
  transactionId: "",
  bank: "",
  bankAccountId: null,
  paidDate: "",
  status: "Pending",
  staff: "",
  department: "",
  notes: "",
  description: "",
  location: "",
  referenceNumber: "",
  dueDate: "",
  recurring: "No",
  frequency: "",
  vendorEmail: "",
  vendorPhone: "",
  discount: "",
  gstAmount: "",
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

export default function Expense() {
  const queryClient = useQueryClient();
  const [bankAccounts, setBankAccounts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [tab, setTab] = useState("basic");
  const [openForm, setOpenForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [savedExtraInstallmentsCount, setSavedExtraInstallmentsCount] = useState(0);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewDetail, setViewDetail] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [bankModalFor, setBankModalFor] = useState(null);
  const [firstInvalidBankKey, setFirstInvalidBankKey] = useState(null);
  const firstInvalidBankRef = useRef(null);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [addCategoryModalOpen, setAddCategoryModalOpen] = useState(false);
  const [manageCategoriesModalOpen, setManageCategoriesModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addCategorySaving, setAddCategorySaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [bankFilter, setBankFilter] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const filters = useMemo(() => {
    const now = new Date();
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
      vendor: vendorFilter || undefined,
      date_from,
      date_to,
      page: currentPage,
      per_page: 20,
    };
  }, [searchDebounced, statusFilter, categoryFilter, bankFilter, vendorFilter, dateFilter, dateFrom, dateTo, currentPage, today]);

  const { data: expenseResult, isLoading: expenseLoading } = useExpenseList(filters);

  const summaryFilters = useMemo(() => {
    const { page, per_page, ...rest } = filters;
    return rest;
  }, [filters]);

  const { data: expenseSummary } = useExpenseSummary(summaryFilters);

  const expenseRecords = Array.isArray(expenseResult?.data) ? expenseResult.data : [];
  const expenseMeta = expenseResult?.meta ?? null;

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchDebounced, statusFilter, categoryFilter, bankFilter, vendorFilter, dateFilter, dateFrom, dateTo]);

  useEffect(() => {
    const loadSupport = async () => {
      try {
        const [categories, banks] = await Promise.all([
          getExpenseCategories().catch(() => []),
          getBankAccounts().then((b) => (Array.isArray(b) ? b : [])),
        ]);
        setExpenseCategories(categories || []);
        setBankAccounts(banks || []);
      } catch (e) {
        console.error("Failed to load support data", e);
      }
    };
    loadSupport();
  }, []);

  useEffect(() => {
    if (!firstInvalidBankKey) return;
    const timer = setTimeout(() => {
      if (firstInvalidBankRef.current) firstInvalidBankRef.current.focus();
      setFirstInvalidBankKey(null);
    }, 100);
    return () => clearTimeout(timer);
  }, [firstInvalidBankKey]);

  const loadData = () => {
    invalidateCache("/expenses");
    queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
  };

  const subtotal = parseFloat(form.amount) || 0;
  const discountVal = parseFloat(form.discount) || 0;
  const taxVal = parseFloat(form.gstAmount) || 0;
  const totalAmount = Math.max(0, subtotal - discountVal + taxVal);
  const initialDeposit = form.initialDepositEnabled ? parseFloat(form.initialDepositAmount) || 0 : 0;
  const sumInstallments = (form.extraInstallments || []).reduce(
    (s, i) => s + (parseFloat(i.amount) || 0),
    0
  );
  const balanceDue = Math.max(0, totalAmount - initialDeposit - sumInstallments);

  const getBankDisplayName = (bankId) => {
    const b = bankAccounts.find((x) => x.id === bankId);
    return b ? `${b.bankName} - ${b.accountNumber}` : "";
  };

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

  const openEdit = (item) => {
    setIsSaving(false);
    const extra = Array.isArray(item.extraInstallments) ? item.extraInstallments : [];
    const hasInitial =
      item.initialDepositAmount != null &&
      item.initialDepositAmount !== "" &&
      parseFloat(item.initialDepositAmount) > 0;
    const loaded = {
      ...emptyForm,
      ...item,
      discount:
        item.discountAmount != null && item.discountAmount !== ""
          ? String(item.discountAmount)
          : "",
      gstAmount:
        item.gstAmount != null && item.gstAmount !== "" ? String(item.gstAmount) : "",
      extraInstallments: extra.map((i) => ({
        ...i,
        bankName: i.bankName || getBankDisplayName(i.bankAccountId),
      })),
      initialDepositEnabled: !!hasInitial,
      initialDepositAmount: hasInitial ? String(item.initialDepositAmount) : "",
      initialDepositBankId: item.initialDepositBankId || null,
      initialDepositBankName:
        item.initialDepositBankName || getBankDisplayName(item.initialDepositBankId),
    };
    setForm(loaded);
    setErrors({});
    setEditId(item.id);
    setSavedExtraInstallmentsCount(extra.length);
    setFirstInvalidBankKey(null);
    setTab("basic");
    setOpenForm(true);
  };

  const openViewModal = (expense) => {
    if (!expense?.id) return;
    setViewDetail(expense);
    setViewModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this expense record?")) return;
    try {
      await deleteExpense(id);
      toast.success("Expense record deleted successfully");
      loadData();
    } catch (e) {
      toast.error("Failed to delete record");
    }
  };

  const validate = () => {
    const e = {};
    if (!form.vendor) e.vendor = "Vendor is required";
    if (!form.expenseType) e.expenseType = "Expense type is required";
    if (!form.amount) e.amount = "Subtotal is required";
    const initialAmt = parseFloat(form.initialDepositAmount) || 0;
    if (form.initialDepositEnabled && initialAmt > 0 && !form.initialDepositBankId) {
      e.initialDepositBank = "Please select bank account for initial deposit";
    }
    (form.extraInstallments || []).forEach((row, idx) => {
      const amt = parseFloat(row.amount) || 0;
      if (amt > 0 && !row.bankAccountId) {
        e[`installmentBank_${idx}`] = "Please select bank account for installment payment";
      }
    });
    if (form.category && !expenseCategories.some((c) => c.name === form.category)) {
      e.category = "Please select a category from the list";
    }
    if (Object.keys(e).length > 0) {
      setErrors(e);
      const bankMsg =
        e.initialDepositBank ||
        (() => {
          const k = Object.keys(e).find((key) => key.startsWith("installmentBank_"));
          return k ? e[k] : null;
        })();
      toast.error(
        bankMsg || e.vendor || e.expenseType || e.amount || Object.values(e)[0]
      );
      if (e.initialDepositBank) {
        setFirstInvalidBankKey("initialDepositBank");
        setTab("financial");
      } else {
        const firstIdx = (form.extraInstallments || []).findIndex(
          (_, i) => e[`installmentBank_${i}`]
        );
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
    const payload = {
      ...form,
      paidDate: form.paidDate || null,
      initialDepositAmount: form.initialDepositEnabled
        ? (form.initialDepositAmount ? parseFloat(form.initialDepositAmount) : null)
        : null,
      initialDepositBankId: form.initialDepositEnabled ? form.initialDepositBankId : null,
    };
    try {
      if (editId) {
        await updateExpense(editId, payload);
        toast.success("Expense updated successfully");
      } else {
        await createExpense(payload);
        toast.success("Expense added successfully");
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
      await queryClient.refetchQueries({ queryKey: queryKeys.expenses.all });
      loadData();
      setOpenForm(false);
    } catch (e) {
      console.error("Failed to save", e);
      setIsSaving(false);
      if (e.response?.data?.errors) {
        setErrors(e.response.data.errors);
        toast.error("Validation failed. Please check the form.");
      } else {
        toast.error("Failed to save record: " + (e.message || "Unknown error"));
      }
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
        <p className="text-[11px] text-slate-400 font-medium tracking-tight">Expense metrics</p>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 w-full mx-auto animate-fade-in space-y-6 md:space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Expense Tracking
          </h1>
          <p className="text-slate-500 mt-1 text-lg">
            Monitor and control your business spending.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="btn-primary group relative flex items-center gap-2 overflow-hidden shadow-[0_8px_20px_rgba(124,58,237,0.25)]"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer transition-none" />
          <Plus size={20} className="relative z-10" />
          <span className="relative z-10">Add Expense</span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <StatCard
          title="Total Expenses"
          value={
            expenseSummary != null
              ? `₹${Number(expenseSummary.totalExpenses || 0).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}`
              : "—"
          }
          icon={CreditCard}
          color="bg-slate-600"
        />
        <StatCard
          title="Total Paid"
          value={
            expenseSummary != null
              ? `₹${Number(expenseSummary.totalPaid || 0).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}`
              : "—"
          }
          icon={TrendingDown}
          color="bg-emerald-600"
        />
        <StatCard
          title="Balance Due"
          value={
            expenseSummary != null
              ? `₹${Number(expenseSummary.totalBalance || 0).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}`
              : "—"
          }
          icon={AlertCircle}
          color="bg-amber-600"
        />
        <StatCard
          title="This Month Expenses"
          value={
            expenseSummary != null
              ? `₹${Number(expenseSummary.thisMonthExpenses || 0).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}`
              : "—"
          }
          icon={CalendarIcon}
          color="bg-blue-600"
        />
      </div>

      <div className="space-y-3">
        <div className="bg-white/70 backdrop-blur-xl px-4 py-3 rounded-lg border border-slate-100 shadow-xl shadow-slate-200/20 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[240px] relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600 transition-colors w-4 h-4" />
            <input
              type="text"
              placeholder="Search expenses..."
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
                <option value="Partial">Partial</option>
                <option value="Pending">Pending</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 px-3.5 bg-white rounded-lg border border-slate-200 hover:border-brand-300 transition-all cursor-pointer group shadow-sm h-10">
              <CalendarIcon className="h-3.5 w-3.5 text-slate-500 group-hover:text-brand-500" />
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

            {(searchQuery || statusFilter !== "All" || categoryFilter || bankFilter || vendorFilter || dateFilter !== "All" || dateFrom || dateTo) && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("All");
                  setCategoryFilter("");
                  setBankFilter("");
                  setVendorFilter("");
                  setDateFilter("All");
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
                {expenseCategories.map((c) => (
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
              <AlertCircle className="h-3.5 w-3.5 text-slate-500 group-hover:text-brand-500" />
              <input
                type="text"
                placeholder="Vendor..."
                value={vendorFilter}
                onChange={(e) => setVendorFilter(e.target.value)}
                className="bg-transparent text-[13px] py-1.5 font-medium text-slate-700 outline-none w-full"
              />
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

      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-4 md:px-6 md:py-5 border-b border-gray-100 flex flex-col lg:flex-row justify-between items-start lg:items-center bg-gray-50/50 gap-4">
          <h3 className="font-bold text-slate-800">Expense Records</h3>
          <div className="flex flex-wrap gap-2 w-full lg:w-auto">
            <span className="text-xs font-semibold text-slate-500 bg-gray-100 px-2 py-1 rounded-lg">
              {expenseLoading ? "Loading..." : expenseMeta ? `Showing ${(expenseMeta.current_page - 1) * expenseMeta.per_page + 1}–${Math.min(expenseMeta.current_page * expenseMeta.per_page, expenseMeta.total)} of ${expenseMeta.total}` : `Showing ${expenseRecords.length}`}
            </span>
            <button
              onClick={() => exportToCSV(expenseRecords.map((r) => ({ id: r.id, vendor: r.vendor, amount: r.amount, method: r.method, date: r.paidDate, bank: r.bank, status: r.status, category: r.category })), "expense_records")}
              className="p-2 bg-white border border-gray-200 rounded-lg text-slate-500 hover:bg-gray-50"
              title="Export to CSV"
            >
              <Download size={18} />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          {expenseLoading ? (
            <TableSkeleton rows={6} cols={7} />
          ) : (
          <table className="w-full text-sm text-left min-w-[800px]">
            <thead className="bg-slate-50/80 text-[13px] font-semibold text-slate-600 capitalize tracking-normal border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Vendor</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4">Method</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Bank</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {expenseRecords.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <Receipt className="h-12 w-12 mb-3 opacity-20" />
                      <p className="text-lg font-medium text-gray-500">No expense records found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                expenseRecords.map((expense) => (
                  <tr key={expense.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-600">{expense.id}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{expense.vendor || "—"}</td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900 font-mono">
                      ₹{parseFloat(expense.netAmount || expense.amount || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{expense.method || "—"}</td>
                    <td className="px-6 py-4 text-slate-600 font-mono text-xs">{expense.paidDate || "—"}</td>
                    <td className="px-6 py-4 text-slate-600 text-xs">{expense.bank || "—"}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center gap-2">
                        <button onClick={() => openViewModal(expense)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors"><Eye size={18} /></button>
                        <button onClick={() => openEdit(expense)} className="p-2 text-slate-400 hover:text-blue-600 rounded-lg transition-colors"><Edit2 size={18} /></button>
                        <button onClick={() => handleDelete(expense.id)} className="p-2 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          )}
        </div>
      </div>

      {viewModalOpen && viewDetail && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300 backdrop-blur-sm">
          <div className="bg-white max-w-2xl w-full rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-[0.98] duration-300 border border-white/20">
            {/* Header / Banner */}
            <div className="relative shrink-0 p-8 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white overflow-hidden">
              {/* Abstract decorative elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2"></div>
              
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-brand-500 animate-pulse shadow-[0_0_10px_#ea580c]"></span>
                    <span className="text-brand-400 font-black uppercase tracking-[0.25em] text-[10px]">Expense Record #{viewDetail.id}</span>
                  </div>
                  <h2 className="text-4xl font-black tracking-tight text-white drop-shadow-sm">{viewDetail.vendor || 'Unnamed Vendor'}</h2>
                  <div className="flex items-center gap-3">
                    <div className={clsx(
                      "px-4 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider border shadow-sm flex items-center gap-2",
                      viewDetail.status === 'Paid' ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" :
                      viewDetail.status === 'Partial' ? "bg-amber-500/20 border-amber-500/30 text-amber-400" :
                      "bg-rose-500/20 border-rose-500/30 text-rose-400"
                    )}>
                      <div className={clsx("h-1.5 w-1.5 rounded-full", 
                        viewDetail.status === 'Paid' ? "bg-emerald-400" : 
                        viewDetail.status === 'Partial' ? "bg-amber-400" : "bg-rose-400"
                      )}></div>
                      {viewDetail.status || 'Pending'}
                    </div>
                    <div className="h-6 w-[1.5px] bg-white/10"></div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl">
                      <Layers size={14} className="text-slate-400" />
                      <span className="text-slate-300 text-[11px] font-bold uppercase tracking-widest">{viewDetail.expenseType || 'General Expense'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col md:items-end bg-white/5 backdrop-blur-md p-5 rounded-3xl border border-white/10 shadow-inner">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5 opacity-80">Total Value</span>
                  <p className="text-4xl font-black text-white leading-none tracking-tight">
                    ₹{Number(viewDetail.totalAmount || viewDetail.amount || 0).toLocaleString()}
                  </p>
                  {parseFloat(viewDetail.balanceDue || 0) > 0 && (
                    <div className="flex items-center gap-1.5 mt-3 text-rose-400 text-[11px] font-black bg-rose-500/15 px-3 py-1 rounded-full border border-rose-500/20">
                      <AlertCircle size={13} strokeWidth={3} />
                      DUE: ₹{Number(viewDetail.balanceDue).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
              
              <button 
                onClick={() => setViewModalOpen(false)}
                className="absolute top-6 right-6 h-9 w-9 rounded-full bg-white/10 hover:bg-rose-500/20 text-white/40 hover:text-rose-400 flex items-center justify-center transition-all active:scale-90 border border-white/10"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 pt-8 space-y-12">
              
              {/* Main Info sections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                
                {/* Basic Details Section */}
                <div className="space-y-6">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100 pb-3 flex items-center gap-2.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-brand-500"></div> Details & Classification
                  </h3>
                  <div className="grid grid-cols-1 gap-5">
                    <div className="flex flex-col group">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Business Category</span>
                      <span className="text-[15px] font-bold text-slate-800 transition-colors group-hover:text-brand-600">{viewDetail.category || 'Uncategorized'}</span>
                    </div>
                    <div className="flex flex-col group">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Project Assignment</span>
                      <span className="text-[15px] font-bold text-slate-800 transition-colors group-hover:text-brand-600">{viewDetail.project || 'No associated project'}</span>
                    </div>
                    <div className="flex flex-col group">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Bill / Invoice ID</span>
                      <span className="text-[15px] font-mono font-black text-slate-900 bg-slate-100/80 px-2.5 py-1 rounded-xl inline-block w-fit border border-slate-200 transition-all group-hover:bg-white group-hover:border-brand-300">{viewDetail.billNo || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Logistics Info Section */}
                <div className="space-y-6">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100 pb-3 flex items-center gap-2.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-indigo-500"></div> Logistics & Timeline
                  </h3>
                  <div className="space-y-5">
                    <div className="flex items-center gap-10">
                      <div className="flex flex-col flex-1">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Execution Date</span>
                        <div className="flex items-center gap-2 text-[15px] font-bold text-slate-800">
                          <CalendarIcon size={16} className="text-slate-400" />
                          {viewDetail.paidDate || '—'}
                        </div>
                      </div>
                      <div className="flex flex-col flex-1">
                        <span className="text-[10px] font-extrabold text-rose-400/80 uppercase tracking-widest mb-1">Settlement Deadline</span>
                        <div className="flex items-center gap-2 text-[15px] font-bold text-rose-600">
                          <CalendarIcon size={16} className="text-rose-300" />
                          {viewDetail.dueDate || 'No deadline'}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col group">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1 text-indigo-500/80">Operational Venue</span>
                      <div className="flex items-center gap-2 text-[15px] font-bold text-slate-800 transition-colors group-hover:text-indigo-600">
                        <MapPin size={16} className="text-slate-400 group-hover:text-indigo-400" />
                        {viewDetail.location || 'Centralized Operations'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Summary Section */}
              <div className="relative p-8 bg-slate-50 border border-slate-100 rounded-[32px] overflow-hidden group hover:border-brand-200 transition-all">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Receipt size={80} />
                </div>
                <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400 mb-6 flex items-center gap-2">
                  <Receipt size={14} className="text-brand-500" /> Accounting Breakdown
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Gross Subtotal</span>
                    <p className="text-lg font-black text-slate-900 font-mono">₹{Number(viewDetail.amount || 0).toLocaleString()}</p>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-extrabold text-emerald-500 uppercase tracking-widest">Rebate / Discount</span>
                    <p className="text-lg font-black text-emerald-600 font-mono">- ₹{Number(viewDetail.discountAmount || viewDetail.discount || 0).toLocaleString()}</p>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Statutory GST</span>
                    <p className="text-lg font-black text-slate-900 font-mono">+ ₹{Number(viewDetail.gstAmount || 0).toLocaleString()}</p>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-extrabold text-brand-500 uppercase tracking-widest">Net Outflow</span>
                    <p className="text-xl font-black text-brand-600 font-mono">
                      ₹{Number(viewDetail.totalAmount || (parseFloat(viewDetail.amount || 0) - parseFloat(viewDetail.discountAmount || viewDetail.discount || 0) + parseFloat(viewDetail.gstAmount || 0))).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment & Assignment Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100 pb-3 flex items-center gap-2.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div> Settlement Information
                  </h3>
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500 border border-slate-200">
                        <CreditCard size={20} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Mode & Channel</span>
                        <div className="flex items-center gap-2 text-[14px] font-bold text-slate-800">
                          <span className="px-2.5 py-1 bg-brand-50 text-[9px] text-brand-600 font-black uppercase rounded-lg border border-brand-100">{viewDetail.method || 'Internal Transfer'}</span>
                          {viewDetail.bank || 'Standard Bank Channel'}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Transaction Link</span>
                        <span className="text-[13px] font-mono font-bold text-slate-600 truncate bg-slate-50 p-1.5 rounded-lg border border-slate-100">{viewDetail.transactionId || 'NO_LINKED_TXN'}</span>
                      </div>
                      <div className="flex flex-col ml-2">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Reporting Agent</span>
                        <div className="flex items-center gap-2 text-[14px] font-bold text-slate-800">
                          <User size={14} className="text-slate-400" />
                          <span className="italic">{viewDetail.staff || 'System Admin'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100 pb-3 flex items-center gap-2.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-fuchsia-500"></div> Metadata & Context
                  </h3>
                  <div className="space-y-5">
                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-200/50">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 block">Formal Scope</span>
                      <p className="text-[13.5px] font-medium text-slate-600 leading-relaxed italic">
                        {viewDetail.description || 'Comprehensive expenditure details not cataloged.'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5 block">Audit Clarification</span>
                      <p className="text-[13px] font-bold text-slate-500 leading-relaxed bg-brand-50/30 p-3 rounded-xl border border-brand-100/50">
                        {viewDetail.notes || 'No administrative annotations detected.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Installment History - Premium Cards */}
              {viewDetail.extraInstallments && viewDetail.extraInstallments.length > 0 && (
                <div className="space-y-5">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400 flex items-center gap-3">
                    <div className="h-4 w-1 bg-brand-500 rounded-full"></div> Payment Disbursement History
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {viewDetail.extraInstallments.map((inst, i) => (
                      <div key={i} className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-3xl group hover:border-brand-300 hover:shadow-xl hover:shadow-brand-500/5 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-brand-600 group-hover:text-white transition-all shadow-sm">
                            <Banknote size={20} />
                          </div>
                          <div>
                            <p className="text-[15px] font-black text-slate-800">₹{Number(inst.amount).toLocaleString()}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <CalendarIcon size={12} className="text-slate-300" />
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{inst.date}</p>
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[10px] font-black text-slate-500 uppercase bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">{inst.bankName || 'O_TRANSFER'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Premium Footer Actions */}
            <div className="shrink-0 px-8 py-6 border-t border-slate-100 bg-slate-50/80 backdrop-blur-md flex items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => { setViewModalOpen(false); openEdit(viewDetail); }}
                  className="group flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-200 text-slate-700 text-[13px] font-bold rounded-2xl hover:bg-slate-50 hover:border-slate-400 transition-all active:scale-[0.97] shadow-sm"
                >
                  <Edit2 size={15} className="text-brand-500" /> Administrative Update
                </button>
                <button 
                  onClick={() => { handleDelete(viewDetail.id); setViewModalOpen(false); }}
                  className="flex items-center gap-2.5 px-6 py-2.5 bg-white border border-rose-100 text-rose-500 text-[13px] font-bold rounded-2xl hover:bg-rose-50 hover:border-rose-300 transition-all active:scale-[0.97] shadow-sm"
                >
                  <Trash2 size={15} /> Expunge Record
                </button>
              </div>
              
              <button 
                onClick={() => setViewModalOpen(false)}
                className="px-10 py-3 bg-slate-950 text-white text-[13.5px] font-black rounded-2xl hover:bg-slate-800 transition-all active:scale-[0.97] shadow-xl shadow-slate-900/20 uppercase tracking-widest"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {openForm && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-3xl rounded-t-[32px] sm:rounded-[24px] shadow-2xl flex flex-col max-h-[96vh] border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-[0.98] duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-8 pt-8 pb-6 shrink-0">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="h-9 w-9 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/30">
                    <TrendingDown size={18} className="text-white" />
                  </div>
                  <h2 className="text-[22px] font-extrabold text-slate-900 tracking-tight">
                    {editId ? 'Modify Expense Entry' : 'New Expense Entry'}
                  </h2>
                </div>
                <p className="text-[13.5px] text-slate-400 font-medium ml-12">Log your business expenditures.</p>
              </div>
              <button onClick={() => setOpenForm(false)} className="h-9 w-9 bg-slate-100 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full flex items-center justify-center transition-all active:scale-90">
                <X size={18} />
              </button>
            </div>

            {/* Step Tabs */}
            <div className="px-8 pb-6 shrink-0">
              <div className="flex items-center gap-0">
                {[
                  { id:'basic',label:'General',icon:ShoppingCart },
                  { id:'financial',label:'Payment',icon:Wallet },
                  { id:'installments',label:'Installments',icon:Layers },
                  { id:'internal',label:'Internal',icon:Briefcase },
                ].map((step, idx, arr) => {
                  const isActive = step.id === tab;
                  const order = ['basic','financial','installments','internal'];
                  const isDone = order.indexOf(tab) > idx;
                  const StepIcon = step.icon;
                  return (
                    <div key={step.id} className="flex items-center flex-1">
                      <button onClick={() => setTab(step.id)} className="flex flex-col items-center gap-1.5 group transition-all flex-1">
                        <div className={clsx("h-9 w-9 rounded-full flex items-center justify-center transition-all duration-300 border-2", isActive?"bg-brand-600 border-brand-600 shadow-lg shadow-brand-500/30":isDone?"bg-emerald-500 border-emerald-500":"bg-white border-slate-200 group-hover:border-slate-300")}>
                          {isDone?<Check size={16} className="text-white"/>:<StepIcon size={16} className={isActive?"text-white":"text-slate-400"}/>}
                        </div>
                        <span className={clsx("text-[11.5px] font-bold transition-colors",isActive?"text-brand-600":isDone?"text-emerald-600":"text-slate-400")}>{step.label}</span>
                      </button>
                      {idx<arr.length-1&&<div className={clsx("h-0.5 flex-1 mb-5 mx-1 rounded-full transition-all duration-500",isDone?"bg-emerald-400":"bg-slate-100")}/>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-8 pb-4 custom-scrollbar">
              <div className="max-w-3xl mx-auto py-4">
                {tab === 'basic' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-3 duration-300">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-1">
                        <label className="text-[13px] font-semibold text-slate-700 flex items-center gap-1">Vendor <span className="text-rose-500 text-[11px] font-black">required</span></label>
                        <div className="relative">
                          <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"/>
                          <input className={clsx("w-full pl-11 pr-4 py-3 bg-white border rounded-xl text-[14px] font-semibold text-slate-800 placeholder:text-slate-300 outline-none transition-all",errors.vendor?"border-rose-300 ring-2 ring-rose-100":"border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15")} placeholder="e.g. AWS" value={form.vendor} onChange={(e)=>setForm({...form,vendor:e.target.value})}/>
                        </div>
                        {errors.vendor&&<p className="text-[11.5px] text-rose-500 flex items-center gap-1"><AlertCircle size={11}/> {errors.vendor}</p>}
                      </div>
                      <div className="space-y-1">
                        <label className="text-[13px] font-semibold text-slate-700 flex items-center gap-1">Expense Type <span className="text-rose-500 text-[11px] font-black">required</span></label>
                        <input className={clsx("w-full px-4 py-3 bg-white border rounded-xl text-[14px] font-semibold text-slate-800 placeholder:text-slate-300 outline-none transition-all",errors.expenseType?"border-rose-300 ring-2 ring-rose-100":"border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15")} placeholder="e.g. Hosting" value={form.expenseType} onChange={(e)=>setForm({...form,expenseType:e.target.value})}/>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[13px] font-semibold text-slate-700">Project / Service</label>
                        <input className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] font-semibold text-slate-800 placeholder:text-slate-300 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-all" placeholder="Project Name" value={form.project} onChange={(e)=>setForm({...form,project:e.target.value})}/>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[13px] font-semibold text-slate-700">Category</label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <select className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] font-semibold text-slate-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-all appearance-none" value={form.category} onChange={(e)=>{if(e.target.value==='__add__')return setAddCategoryModalOpen(true);if(e.target.value==='__manage__')return setManageCategoriesModalOpen(true);setForm({...form,category:e.target.value});}}>
                              <option value="">Select category</option>
                              {expenseCategories.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
                              <option value="__add__">+ Add New</option>
                              <option value="__manage__">Manage List</option>
                            </select>
                            <ChevronDown size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"/>
                          </div>
                          <button type="button" onClick={()=>setAddCategoryModalOpen(true)} className="h-[46px] w-[46px] bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl flex items-center justify-center transition-all active:scale-95"><Plus size={18}/></button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[13px] font-semibold text-slate-700">Bill Number</label>
                        <input className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] font-semibold text-slate-800 placeholder:text-slate-300 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-all" placeholder="Bill ID" value={form.billNo} onChange={(e)=>setForm({...form,billNo:e.target.value})}/>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[13px] font-semibold text-slate-700 flex items-center gap-1">Subtotal Amount (₹) <span className="text-rose-500 text-[11px] font-black">required</span></label>
                        <input type="number" step="0.01" className={clsx("w-full px-4 py-3 bg-white border rounded-xl text-[14px] font-bold text-slate-800 placeholder:text-slate-300 outline-none transition-all",errors.amount?"border-rose-300 ring-2 ring-rose-100":"border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15")} placeholder="0.00" value={form.amount} onChange={(e)=>setForm({...form,amount:e.target.value})}/>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[13px] font-semibold text-slate-700">Description</label>
                      <textarea className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] font-medium text-slate-800 placeholder:text-slate-300 outline-none focus:border-brand-500 transition-all min-h-[100px] resize-none" placeholder="Details about this expense…" value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})}/>
                    </div>
                    <div className="flex justify-end pt-2">
                      <button type="button" onClick={()=>setTab('financial')} className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white text-[13.5px] font-bold rounded-xl hover:bg-brand-700 transition-all active:scale-95 shadow-lg shadow-brand-500/20">Next: Payment <ChevronRight size={16}/></button>
                    </div>
                  </div>
                )}

                {tab === 'financial' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-3 duration-300">
                    <div className="bg-slate-900 rounded-2xl p-5 text-white space-y-2">
                      <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">Spending Summary</h4>
                      <div className="flex justify-between text-[13px] text-slate-400"><span>Subtotal Amount</span><span className="text-white font-semibold">₹{Number(form.amount||0).toLocaleString()}</span></div>
                      {parseFloat(form.discount)>0&&<div className="flex justify-between text-[13px] text-emerald-400"><span>Discount</span><span>- ₹{parseFloat(form.discount).toLocaleString()}</span></div>}
                      {parseFloat(form.gstAmount)>0&&<div className="flex justify-between text-[13px] text-slate-400"><span>GST / Tax</span><span className="text-white">+ ₹{parseFloat(form.gstAmount).toLocaleString()}</span></div>}
                      <div className="flex justify-between text-[18px] font-black pt-2 border-t border-slate-700"><span>Total Payable</span><span className="text-brand-400">₹{totalAmount.toLocaleString()}</span></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-1">
                        <label className="text-[13px] font-semibold text-slate-700">Discount (₹)</label>
                        <input type="number" step="0.01" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] font-semibold text-slate-800 placeholder:text-slate-300 outline-none focus:border-brand-500 transition-all" placeholder="0.00" value={form.discount} onChange={(e)=>setForm({...form,discount:e.target.value})}/>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[13px] font-semibold text-slate-700">GST Amount (₹)</label>
                        <input type="number" step="0.01" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] font-semibold text-slate-800 placeholder:text-slate-300 outline-none focus:border-brand-500 transition-all" placeholder="0.00" value={form.gstAmount} onChange={(e)=>setForm({...form,gstAmount:e.target.value})}/>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[13px] font-semibold text-slate-700">Payment Status</label>
                        <div className="relative">
                          <select className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] font-semibold text-slate-800 outline-none focus:border-brand-500 transition-all appearance-none" value={form.status} onChange={(e)=>setForm({...form,status:e.target.value})}>
                            {['Paid','Pending','Partial','Overdue'].map(s=><option key={s} value={s}>{s}</option>)}
                          </select>
                          <ChevronDown size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"/>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[13px] font-semibold text-slate-700">Payment Date</label>
                        <div className="relative">
                          <CalendarIcon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"/>
                          <input type="date" className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] font-semibold text-slate-800 outline-none focus:border-brand-500 transition-all" value={form.paidDate} onChange={(e)=>setForm({...form,paidDate:e.target.value})}/>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
                        <label className="text-[13px] font-semibold text-slate-700">Transaction ID</label>
                        <input className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] font-semibold text-slate-800 placeholder:text-slate-300 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-all" placeholder="UTR / Ref number" value={form.transactionId} onChange={(e)=>setForm({...form,transactionId:e.target.value})}/>
                      </div>
                    </div>
                    <div onClick={()=>setForm({...form,initialDepositEnabled:!form.initialDepositEnabled})} className={clsx("flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all",form.initialDepositEnabled?"bg-brand-50 border-brand-200":"bg-slate-50 border-slate-100 hover:border-slate-200")}>
                      <div className={clsx("h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0",form.initialDepositEnabled?"bg-brand-600 border-brand-600":"bg-white border-slate-300")}>
                        {form.initialDepositEnabled&&<Check size={14} className="text-white"/>}
                      </div>
                      <div>
                        <p className="text-[14px] font-bold text-slate-800">Paid an advance / initial deposit</p>
                        <p className="text-[12px] text-slate-400 font-medium">Record an upfront partial expenditure</p>
                      </div>
                    </div>
                    {form.initialDepositEnabled&&(
                      <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-brand-200 ml-3 animate-in slide-in-from-top-2 duration-200">
                        <div className="space-y-1">
                          <label className="text-[13px] font-semibold text-slate-700">Advance Amount (₹)</label>
                          <input type="number" step="0.01" readOnly={editId&&savedExtraInstallmentsCount>0} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] font-bold text-slate-800 placeholder:text-slate-300 outline-none focus:border-brand-500 transition-all" placeholder="0.00" value={form.initialDepositAmount} onChange={(e)=>setForm({...form,initialDepositAmount:e.target.value})}/>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[13px] font-semibold text-slate-700">Paid From</label>
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

                {tab === 'installments' && (
                  <div className="space-y-5 animate-in fade-in slide-in-from-right-3 duration-300">
                    <p className="text-[13px] text-slate-500 font-medium tracking-tight">Track additional payment installments for this expense record.</p>
                    <div className="space-y-3">
                      {(!form.extraInstallments || form.extraInstallments.length === 0) ? (
                        <div className="py-16 flex flex-col items-center justify-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                          <div className="h-14 w-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-300 mb-3"><Layers size={28}/></div>
                          <p className="text-[14px] font-medium text-slate-400">No installments added yet.</p>
                        </div>
                      ) : form.extraInstallments.map((row, idx) => {
                        const rowIsSaved = editId && idx < savedExtraInstallmentsCount;
                        return (
                          <div key={idx} className={clsx("flex items-center gap-3 group rounded-2xl px-4 py-3 border transition-all", rowIsSaved?"bg-slate-50 border-slate-100 opacity-70":"bg-white border-slate-200 hover:border-slate-300")}>
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
                    <button type="button" onClick={()=>setForm({...form,extraInstallments:[...(form.extraInstallments||[]),{date:'',amount:'',bankAccountId:null,bankName:'',note:''}]})} className="flex items-center gap-2 text-[13px] font-bold text-brand-600 hover:text-brand-700 px-4 py-2 hover:bg-brand-50 rounded-xl transition-all">
                      <Plus size={16}/> Add Installment
                    </button>
                    <div className="flex justify-between pt-2">
                       <button type="button" onClick={()=>setTab('financial')} className="flex items-center gap-1.5 px-5 py-2.5 text-slate-500 hover:text-slate-700 text-[13.5px] font-bold transition-all">← Back</button>
                       <button type="button" onClick={()=>setTab('internal')} className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white text-[13.5px] font-bold rounded-xl hover:bg-brand-700 transition-all active:scale-95 shadow-lg shadow-brand-500/20">Next: Internal <ChevronRight size={16}/></button>
                    </div>
                  </div>
                )}

                {tab === 'internal' && (
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
                        <label className="text-[13px] font-semibold text-slate-700">Reference Number</label>
                        <input className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] font-semibold text-slate-800 placeholder:text-slate-300 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-all" placeholder="Internal reference or PO number" value={form.referenceNumber} onChange={(e)=>setForm({...form,referenceNumber:e.target.value})}/>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[13px] font-semibold text-slate-700">Location</label>
                        <div className="relative">
                          <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"/>
                          <input className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] font-semibold text-slate-800 placeholder:text-slate-300 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-all" placeholder="City or Office location" value={form.location} onChange={(e)=>setForm({...form,location:e.target.value})}/>
                        </div>
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-[13px] font-semibold text-slate-700">Internal Notes</label>
                        <textarea className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] font-medium text-slate-800 placeholder:text-slate-300 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-all min-h-[80px] resize-none" placeholder="Restricted notes for internal audit only…" value={form.notes} onChange={(e)=>setForm({...form,notes:e.target.value})}/>
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
                <span className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">Total Outflow</span>
                <span className="text-[22px] font-black text-slate-900 leading-tight">₹{totalAmount.toLocaleString()}</span>
                {form.initialDepositEnabled && parseFloat(form.initialDepositAmount) > 0 && (
                  <span className="text-[11px] text-slate-400 font-medium">Balance: ₹{Math.max(0, balanceDue).toLocaleString()}</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setOpenForm(false)} className="px-6 py-3 bg-white border border-slate-200 text-slate-600 text-[14px] font-bold rounded-xl hover:bg-slate-50 transition-all active:scale-95">Cancel</button>
                <button type="button" onClick={handleSave} disabled={isSaving} className="flex items-center gap-2.5 px-8 py-3 bg-brand-600 hover:bg-brand-700 text-white text-[14px] font-extrabold rounded-xl shadow-xl shadow-brand-500/25 hover:shadow-brand-500/40 transition-all active:scale-95 disabled:opacity-60">
                  {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  {isSaving ? 'Saving...' : editId ? 'Save Changes' : 'Save Record'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {bankModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-[0.95]">
            <div className="px-6 py-4 border-b border-slate-50 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-800">Assign Bank Account</h3>
              <button onClick={() => setBankModalOpen(false)} className="p-1 text-slate-400 hover:text-rose-500"><X size={18} /></button>
            </div>
            <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
              {bankAccounts.map((b) => (
                <button
                  key={b.id}
                  onClick={() => {
                    const name = `${b.bankName} - ${b.accountNumber}`;
                    if (bankModalFor === "initial") {
                      setForm((prev) => ({ ...prev, initialDepositBankId: b.id, initialDepositBankName: name }));
                    } else if (bankModalFor?.type === "installment") {
                      const next = [...form.extraInstallments];
                      next[bankModalFor.index] = { ...next[bankModalFor.index], bankAccountId: b.id, bankName: name };
                      setForm((prev) => ({ ...prev, extraInstallments: next }));
                    }
                    setBankModalOpen(false);
                  }}
                  className="w-full text-left p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all flex items-center gap-3"
                >
                  <div className="h-8 w-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500"><Landmark size={16} /></div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{b.bankName}</p>
                    <p className="text-xs text-slate-400 uppercase">{b.accountNumber}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {addCategoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">New Category Channel</h3>
              <button onClick={() => setAddCategoryModalOpen(false)}><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label text="Name" />
                <input type="text" className="input-premium" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
              </div>
              <button 
                onClick={async () => {
                  setAddCategorySaving(true);
                  try {
                    const created = await createExpenseCategory(newCategoryName);
                    const list = await getExpenseCategories();
                    setExpenseCategories(list);
                    setForm(prev => ({ ...prev, category: created.name }));
                    setAddCategoryModalOpen(false);
                    setNewCategoryName("");
                    toast.success("Category added");
                  } catch (e) { toast.error("Error adding category"); }
                  finally { setAddCategorySaving(false); }
                }}
                disabled={!newCategoryName || addCategorySaving}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg"
              >
                {addCategorySaving ? 'Saving...' : 'Add Channel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {manageCategoriesModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[70] flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-50 flex justify-between items-center">
                 <h3 className="font-bold text-slate-800">Manage Logic Channels</h3>
                 <button onClick={() => setManageCategoriesModalOpen(false)}><X size={18} /></button>
              </div>
              <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
                 {expenseCategories.map(c => (
                   <div key={c.id} className="flex items-center justify-between p-3 px-5 bg-slate-50 rounded-xl border border-slate-100 group transition-all">
                      <span className="text-sm font-bold text-slate-700">{c.name}</span>
                      <button onClick={async () => {
                         try {
                           await deleteExpenseCategory(c.id);
                           setExpenseCategories(await getExpenseCategories());
                           toast.success("Category removed");
                         } catch (e) { toast.error("Active category cannot be deleted"); }
                      }} className="p-2 text-rose-400 opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
