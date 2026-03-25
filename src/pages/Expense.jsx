import { useEffect, useState, useRef, useMemo } from "react";
import { 
  Eye, Edit2, Trash2, Plus, Download, Search, X, Check, Landmark, Wallet, 
  TrendingUp, TrendingDown, AlertCircle, Receipt, Loader2, Save, Layers, User, Target, 
  Building2, Calendar as CalendarIcon, Phone, Mail, BadgeCheck, Activity, 
  Briefcase, Filter, MessageSquare, CreditCard, Banknote, CheckCircle2,
  ShoppingCart, Truck, MapPin
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
  const { data: expenseSummary } = useExpenseSummary();

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
        setTab("summary");
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
      <div className={clsx("absolute top-0 left-0 right-0 h-[2px]", "bg-gradient-to-r from-indigo-500 to-blue-300")} />
      
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
                      ₹{parseFloat(expense.amount || 0).toLocaleString("en-IN")}
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

      {viewModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white max-w-lg w-full rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">Expense Details</h2>
              <button onClick={() => setViewModalOpen(false)} className="p-2 text-slate-400 hover:text-rose-500"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              {viewDetail && Object.entries(viewDetail).map(([key, val]) => (
                <div key={key} className="flex justify-between border-b border-slate-50 pb-2">
                  <span className="text-slate-500 capitalize">{key.replace(/_/g, ' ')}</span>
                  <span className="font-medium text-slate-800">{String(val || '—')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {openForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-[4px] animate-in fade-in duration-[250ms]">
          <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-white z-20">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-gradient-to-br from-indigo-600 to-blue-500 text-white rounded-xl flex items-center justify-center shadow-lg">
                  <TrendingUp className="h-5 w-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-[20px] font-bold text-slate-900">
                    {editId ? "Modify Expenditure" : "New Expenditure"}
                  </h3>
                  <p className="text-[12px] font-medium text-slate-500 mt-0.5">Capture operational outflow records</p>
                </div>
              </div>
              <button onClick={() => setOpenForm(false)} className="p-2 text-slate-400 hover:text-rose-500"><X size={20} /></button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              <div className="w-64 border-r border-slate-100 bg-slate-50/50 p-4 flex flex-col gap-2">
                {[
                  { id: 'basic', label: 'Primary Context', icon: ShoppingCart, desc: 'Vendor & Project' },
                  { id: 'summary', label: 'Fiscal Summary', icon: Wallet, desc: 'Valuation & Tax' },
                  { id: 'installments', label: 'Payment Splits', icon: Layers, desc: 'Installment Logic' },
                  { id: 'internal', label: 'Internal Ops', icon: Briefcase, desc: 'Staff & Notes' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={clsx(
                      "flex items-center gap-3 p-3.5 rounded-xl transition-all group text-left relative overflow-hidden",
                      tab === t.id ? "bg-white text-indigo-600 shadow-md ring-1 ring-slate-200" : "text-slate-500 hover:bg-white hover:text-slate-900"
                    )}
                  >
                    {tab === t.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600 rounded-full" />}
                    <t.icon className="h-5 w-5" />
                    <div>
                      <p className="text-[14px] font-bold">{t.label}</p>
                      <p className="text-[10px] font-medium opacity-60 uppercase">{t.desc}</p>
                    </div>
                  </button>
                ))}
                
                <div className="mt-auto bg-slate-900 rounded-xl p-5 text-white shadow-lg space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="h-4 w-4 text-indigo-400" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-200">Summary</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-[13px]">
                       <span className="opacity-60">Total Amount</span>
                       <span className="font-black text-indigo-400">₹{totalAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-[13px]">
                       <span className="opacity-60">Balance Due</span>
                       <span className="font-bold text-amber-400">₹{balanceDue.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white">
                <div className="space-y-8 max-w-3xl mx-auto">
                  {tab === "basic" && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                      <SectionHeader icon={Truck} title="Vendor Relationship" color="blue" />
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                          <Label text="Vendor" required />
                          <input className={clsx("input-premium", errors.vendor && "border-rose-400")} placeholder="e.g. AWS" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                          <Label text="Category" />
                          <div className="flex gap-2">
                             <select className="input-premium flex-1" value={form.category} onChange={(e) => {
                               if (e.target.value === "__add__") return setAddCategoryModalOpen(true);
                               if (e.target.value === "__manage__") return setManageCategoriesModalOpen(true);
                               setForm({ ...form, category: e.target.value });
                             }}>
                               <option value="">Select category</option>
                               {expenseCategories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                               <option value="__add__">+ Add New</option>
                               <option value="__manage__">Manage List</option>
                             </select>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                           <Label text="Service / Project" />
                           <input className="input-premium" placeholder="e.g. Hosting" value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                           <Label text="Bill Number" />
                           <input className="input-premium" placeholder="Ref No" value={form.billNo} onChange={(e) => setForm({ ...form, billNo: e.target.value })} />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label text="Description" />
                        <textarea className="input-premium min-h-[100px] py-3" placeholder="Briefly describe the expense..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                      </div>
                    </div>
                  )}

                  {tab === "summary" && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                      <SectionHeader icon={CreditCard} title="Fiscal Architecture" color="rose" />
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                           <Label text="Amount (Subtotal)" required />
                           <input type="number" step="0.01" className="input-premium" placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                           <Label text="Discount" />
                           <input type="number" step="0.01" className="input-premium" placeholder="0.00" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                           <Label text="GST Amount" />
                           <input type="number" step="0.01" className="input-premium" placeholder="0.00" value={form.gstAmount} onChange={(e) => setForm({ ...form, gstAmount: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                           <Label text="Payment Date" />
                           <input type="date" className="input-premium" value={form.paidDate} onChange={(e) => setForm({ ...form, paidDate: e.target.value })} />
                        </div>
                      </div>
                      
                      <div className="space-y-4 pt-4 border-t border-slate-100">
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setForm({ ...form, initialDepositEnabled: !form.initialDepositEnabled })}>
                          <div className={clsx("h-6 w-6 rounded border-2 flex items-center justify-center transition-all", form.initialDepositEnabled ? "bg-indigo-600 border-indigo-600" : "bg-white border-slate-200")}>
                            {form.initialDepositEnabled && <Check size={14} className="text-white" />}
                          </div>
                          <span className="text-[14px] font-bold text-slate-700">Initial Down Payment</span>
                        </div>
                        
                        {form.initialDepositEnabled && (
                          <div className="grid grid-cols-2 gap-6 animate-in slide-in-from-top-2">
                            <div className="space-y-1.5">
                               <Label text="Amount" />
                               <input type="number" step="0.01" className="input-premium" placeholder="0.00" value={form.initialDepositAmount} onChange={(e) => setForm({ ...form, initialDepositAmount: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                               <Label text="Source Bank" />
                               <button type="button" onClick={() => { setBankModalFor("initial"); setBankModalOpen(true); }} className="input-premium text-left relative h-[42px]">
                                 {form.initialDepositBankName || 'Select Bank'}
                                 <Landmark className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                               </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {tab === "installments" && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                        <SectionHeader icon={Layers} title="Sequential Liability" color="indigo" />
                        <button type="button" onClick={() => setForm({ ...form, extraInstallments: [...(form.extraInstallments || []), { date: "", amount: "", bankAccountId: null, bankName: "", note: "" }] })} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-500/20">
                           <Plus size={14} /> Add Installment
                        </button>
                      </div>
                      <div className="space-y-4">
                        {form.extraInstallments.map((row, idx) => (
                          <div key={idx} className="p-4 rounded-xl border border-slate-200 grid grid-cols-12 gap-4 items-end bg-slate-50/30 group">
                            <div className="col-span-3 space-y-1.5">
                               <Label text="Date" />
                               <input type="date" className="input-premium py-1.5 text-xs" value={row.date} onChange={(e) => {
                                 const next = [...form.extraInstallments];
                                 next[idx].date = e.target.value;
                                 setForm({ ...form, extraInstallments: next });
                               }} />
                            </div>
                            <div className="col-span-3 space-y-1.5">
                               <Label text="Amount" />
                               <input type="number" className="input-premium py-1.5 text-xs" placeholder="0.00" value={row.amount} onChange={(e) => {
                                  const next = [...form.extraInstallments];
                                  next[idx].amount = e.target.value;
                                  setForm({ ...form, extraInstallments: next });
                               }} />
                            </div>
                            <div className="col-span-3 space-y-1.5">
                               <Label text="Bank" />
                               <button type="button" onClick={() => { setBankModalFor({ type: "installment", index: idx }); setBankModalOpen(true); }} className="input-premium py-1.5 text-xs text-left h-[34px] relative">
                                 {row.bankName || 'Select'}
                                 <Landmark className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                               </button>
                            </div>
                            <div className="col-span-2 space-y-1.5">
                               <Label text="Note" />
                               <input type="text" className="input-premium py-1.5 text-xs" placeholder="Note" value={row.note} onChange={(e) => {
                                  const next = [...form.extraInstallments];
                                  next[idx].note = e.target.value;
                                  setForm({ ...form, extraInstallments: next });
                               }} />
                            </div>
                            <div className="col-span-1 flex justify-end">
                               <button type="button" onClick={() => setForm({ ...form, extraInstallments: form.extraInstallments.filter((_, i) => i !== idx) })} className="p-2 text-rose-400 hover:bg-rose-50 rounded-lg group-hover:opacity-100 opacity-0 transition-opacity">
                                  <Trash2 size={16} />
                               </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {tab === "internal" && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                      <SectionHeader icon={Briefcase} title="Managerial Assignments" color="fuchsia" />
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                           <Label text="Assigned Staff" />
                           <input className="input-premium" placeholder="Staff Name" value={form.staff} onChange={(e) => setForm({ ...form, staff: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                           <Label text="Department" />
                           <input className="input-premium" placeholder="e.g. Sales" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label text="Internal Notes" />
                        <textarea className="input-premium min-h-[120px] py-3" placeholder="Restricted audit notes..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-8 py-5 border-t border-slate-100 flex justify-between items-center bg-slate-50/50 z-20">
              <button onClick={() => setOpenForm(false)} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-[14px] font-medium hover:bg-slate-50 transition-all active:scale-95 shadow-sm">
                Discard Changes
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-10 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-500 text-white rounded-xl text-[14px] font-bold shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/30 transition-all hover:-translate-y-[2px] active:scale-95 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                <div className="flex items-center gap-2 relative z-10">
                   {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                   <span>{isSaving ? 'Processing...' : (editId ? 'Commit Update' : 'Authorize Expense')}</span>
                </div>
              </button>
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
