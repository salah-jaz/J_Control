import { useEffect, useState, useRef, useMemo } from "react";
import {
  Eye,
  Edit2,
  Trash2,
  Plus,
  Download,
  Search,
  X,
  Landmark,
  CreditCard,
  TrendingDown,
  AlertCircle,
  Receipt,
  Calendar,
  Loader2,
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
  const [dateFilter, setDateFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

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
      date_from,
      date_to,
      page: currentPage,
      per_page: 20,
    };
  }, [searchDebounced, statusFilter, categoryFilter, bankFilter, dateFilter, dateFrom, dateTo, currentPage, today]);

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
  }, [searchDebounced, statusFilter, categoryFilter, bankFilter, dateFilter, dateFrom, dateTo]);

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
  const isSavedRecord = !!editId;

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

  const inputClass = (f) =>
    `input ${errors[f] ? "border-red-500 focus:border-red-500 focus:ring-red-200" : ""}`;
  const Req = () => <span className="text-red-500 ml-1 font-bold">*</span>;

  const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="card hover:border-brand-200/50 group h-36 flex flex-col justify-between p-6">
      <div className="flex justify-between items-start">
        <div className={`p-3.5 rounded-xl ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <h3 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">
            {value}
          </h3>
        </div>
      </div>
      <div className="w-full bg-gray-100 h-1.5 rounded-full mt-4 overflow-hidden">
        <div
          className={`h-full rounded-full ${color} opacity-30`}
          style={{ width: "70%" }}
        />
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
          className="btn-primary flex items-center gap-2 shadow-lg shadow-brand-500/30"
        >
          <Plus size={20} />
          Add Expense
        </button>
      </div>

      {/* SUMMARY CARDS */}
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
          icon={Calendar}
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
              placeholder="Search by vendor, amount, bank..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 w-full"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-100 rounded-xl text-sm font-medium text-slate-600 outline-none focus:border-brand-500 min-w-[120px]"
          >
            <option value="All">All</option>
            <option value="Paid">Paid</option>
            <option value="Partial">Partial</option>
            <option value="Pending">Pending</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-100 rounded-xl text-sm font-medium text-slate-600 outline-none focus:border-brand-500 min-w-[140px]"
          >
            <option value="">All Categories</option>
            {expenseCategories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={bankFilter}
            onChange={(e) => setBankFilter(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-100 rounded-xl text-sm font-medium text-slate-600 outline-none focus:border-brand-500 min-w-[160px]"
          >
            <option value="">All Banks</option>
            {bankAccounts.map((b) => (
              <option key={b.id} value={b.id}>
                {b.bankName} - {b.accountNumber}
              </option>
            ))}
          </select>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-100 rounded-xl text-sm font-medium text-slate-600 outline-none focus:border-brand-500 min-w-[120px]"
          >
            <option value="All">All Time</option>
            <option value="Today">Today</option>
            <option value="This Week">This Week</option>
            <option value="This Month">This Month</option>
            <option value="This Year">This Year</option>
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
        </div>
      </div>

      {/* TABLE */}
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
            <thead className="bg-gray-50/50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-gray-100">
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
                      <p className="text-sm">Add an expense or adjust your filters.</p>
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
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-gray-100 border border-gray-200 rounded-lg text-xs font-semibold text-slate-600">
                        {expense.method || "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-mono text-xs">{expense.paidDate || "—"}</td>
                    <td className="px-6 py-4 text-slate-600 text-xs">{expense.bank || "—"}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        {expense.invoice_id && (
                          <span className="px-2 py-1 bg-violet-50 text-violet-700 border border-violet-200 rounded-lg text-xs font-semibold" title="Created from Invoice">
                            Invoice Linked
                          </span>
                        )}
                        <button
                          onClick={() => openViewModal(expense)}
                          title="View"
                          className="p-2 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                        >
                          <Eye size={18} />
                        </button>
                        {!expense.invoice_id && (
                          <>
                            <button
                              onClick={() => openEdit(expense)}
                              title="Edit"
                              className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(expense.id)}
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
        {expenseMeta && expenseMeta.last_page > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
            <span className="text-sm text-slate-600">
              Showing {(expenseMeta.current_page - 1) * expenseMeta.per_page + 1}–{Math.min(expenseMeta.current_page * expenseMeta.per_page, expenseMeta.total)} of {expenseMeta.total}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={expenseMeta.current_page <= 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-slate-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={expenseMeta.current_page >= expenseMeta.last_page}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-slate-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Expense Details Modal */}
      {viewModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-2 md:p-4 backdrop-blur-sm">
          <div className="bg-white max-w-lg w-full rounded-2xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
            <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight">
                Expense Details
              </h2>
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
                  <div className="text-slate-500">Vendor</div>
                  <div className="font-medium text-slate-800">{viewDetail.vendor || "—"}</div>
                  <div className="text-slate-500">Amount</div>
                  <div className="font-bold text-slate-900">
                    ₹ {parseFloat(viewDetail.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-slate-500">Bank</div>
                  <div className="font-medium text-slate-800">{viewDetail.bank || "—"}</div>
                  <div className="text-slate-500">Method</div>
                  <div className="font-medium text-slate-800">{viewDetail.method || "—"}</div>
                  <div className="text-slate-500">Date</div>
                  <div className="font-medium text-slate-800">{viewDetail.paidDate || "—"}</div>
                  <div className="text-slate-500">Status</div>
                  <div className="font-medium text-slate-800">{viewDetail.status || "—"}</div>
                  <div className="text-slate-500">Category</div>
                  <div className="font-medium text-slate-800">{viewDetail.category || "—"}</div>
                  {viewDetail.description && (
                    <>
                      <div className="text-slate-500">Description</div>
                      <div className="font-medium text-slate-800 col-span-2">{viewDetail.description}</div>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-slate-500 text-center py-8">No details available.</p>
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
                  {editId ? "Edit Expense" : "New Expense Entry"}
                </h2>
                <p className="text-xs md:text-sm text-slate-500 mt-1">
                  Record the details of this expenditure.
                </p>
              </div>
              <button
                onClick={() => setOpenForm(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-gray-100 rounded-full transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex px-4 md:px-6 border-b border-gray-100 bg-gray-50/30 overflow-x-auto flex-shrink-0">
              {[
                { id: "basic", label: "Basic" },
                { id: "summary", label: "Financial Summary" },
                { id: "installments", label: "Extra Installments" },
                { id: "internal", label: "Internal" },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={clsx(
                    "px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-sm font-bold uppercase tracking-wide border-b-2 transition-all whitespace-nowrap",
                    tab === id
                      ? "border-brand-600 text-brand-600"
                      : "border-transparent text-slate-500 hover:text-slate-800 hover:border-gray-200"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {tab === "basic" && (
                  <>
                    <div>
                      <label className="label">Vendor <Req /></label>
                      <input
                        className={inputClass("vendor")}
                        placeholder="e.g. AWS, Office Depot"
                        value={form.vendor}
                        onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label">Expense Type <Req /></label>
                      <input
                        className={inputClass("expenseType")}
                        placeholder="e.g. Software, Office Supplies"
                        value={form.expenseType}
                        onChange={(e) =>
                          setForm({ ...form, expenseType: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="label">Project / Purpose</label>
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
                          className={clsx(
                            "input flex-1",
                            errors.category && "border-red-500"
                          )}
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
                          {expenseCategories.map((c) => (
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
                      {errors.category && (
                        <p className="text-sm text-red-500 mt-1">{errors.category}</p>
                      )}
                    </div>
                    <div>
                      <label className="label">Bill / Invoice No</label>
                      <input
                        className="input"
                        value={form.billNo}
                        onChange={(e) =>
                          setForm({ ...form, billNo: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="label">Subtotal (₹) <Req /></label>
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
                      <label className="label">Payment Date</label>
                      <input
                        type="date"
                        className="input"
                        value={form.paidDate}
                        onChange={(e) =>
                          setForm({ ...form, paidDate: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="label">Description</label>
                      <textarea
                        className="input min-h-[80px]"
                        placeholder="Detailed description of the expense"
                        value={form.description}
                        onChange={(e) =>
                          setForm({ ...form, description: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="label">Reference Number</label>
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
                      <label className="label">Due Date</label>
                      <input
                        type="date"
                        className="input"
                        value={form.dueDate}
                        onChange={(e) =>
                          setForm({ ...form, dueDate: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="label">Vendor Email</label>
                      <input
                        type="email"
                        className="input"
                        placeholder="vendor@example.com"
                        value={form.vendorEmail}
                        onChange={(e) =>
                          setForm({ ...form, vendorEmail: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="label">Vendor Phone</label>
                      <input
                        className="input"
                        placeholder="+91-9876543210"
                        value={form.vendorPhone}
                        onChange={(e) =>
                          setForm({ ...form, vendorPhone: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="label">Location</label>
                      <input
                        className="input"
                        placeholder="e.g. Office, Online"
                        value={form.location}
                        onChange={(e) =>
                          setForm({ ...form, location: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="label">Recurring</label>
                      <select
                        className="input"
                        value={form.recurring}
                        onChange={(e) =>
                          setForm({ ...form, recurring: e.target.value })
                        }
                      >
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                    </div>
                    {form.recurring === "Yes" && (
                      <div>
                        <label className="label">Frequency</label>
                        <select
                          className="input"
                          value={form.frequency}
                          onChange={(e) =>
                            setForm({ ...form, frequency: e.target.value })
                          }
                        >
                          <option value="">Select</option>
                          <option value="Monthly">Monthly</option>
                          <option value="Quarterly">Quarterly</option>
                          <option value="Yearly">Yearly</option>
                          <option value="Weekly">Weekly</option>
                        </select>
                      </div>
                    )}
                  </>
                )}

                {tab === "summary" && (
                  <div className="md:col-span-2 space-y-6">
                    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                      <h3 className="text-base font-bold text-slate-800 mb-4">
                        Financial Summary
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="label">Subtotal (₹)</label>
                          <input
                            type="text"
                            readOnly
                            className="input bg-gray-50"
                            value={
                              form.amount
                                ? `₹${Number(form.amount).toLocaleString("en-IN", {
                                    minimumFractionDigits: 2,
                                  })}`
                                : "₹0.00"
                            }
                          />
                        </div>
                        <div>
                          <label className="label">Discount (₹)</label>
                          <input
                            type="number"
                            step="0.01"
                            className="input"
                            placeholder="0.00"
                            value={form.discount}
                            onChange={(e) =>
                              setForm({ ...form, discount: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <label className="label">Tax Amount (₹)</label>
                          <input
                            type="number"
                            step="0.01"
                            className="input"
                            placeholder="0.00"
                            value={form.gstAmount}
                            onChange={(e) =>
                              setForm({ ...form, gstAmount: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <label className="label">Total Amount (₹)</label>
                          <input
                            type="text"
                            readOnly
                            className="input bg-brand-50 font-bold"
                            value={`₹${totalAmount.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}`}
                          />
                        </div>
                      </div>
                      <div className="mt-6 pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-2 mb-4">
                          <input
                            type="checkbox"
                            id="initialDeposit"
                            checked={form.initialDepositEnabled}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                initialDepositEnabled: e.target.checked,
                                initialDepositAmount: e.target.checked
                                  ? form.initialDepositAmount
                                  : "",
                                initialDepositBankId: e.target.checked
                                  ? form.initialDepositBankId
                                  : null,
                                initialDepositBankName: e.target.checked
                                  ? form.initialDepositBankName
                                  : "",
                              })
                            }
                            className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                          />
                          <label
                            htmlFor="initialDeposit"
                            className="text-sm font-medium text-slate-700"
                          >
                            Initial Deposit
                          </label>
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
                                onChange={(e) =>
                                  setForm({
                                    ...form,
                                    initialDepositAmount: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div>
                              <label className="label">Bank Account</label>
                              <div className="flex gap-2">
                                <button
                                  ref={
                                    firstInvalidBankKey === "initialDepositBank"
                                      ? firstInvalidBankRef
                                      : null
                                  }
                                  type="button"
                                  onClick={() => {
                                    setBankModalFor("initial");
                                    setBankModalOpen(true);
                                  }}
                                  disabled={isSavedRecord}
                                  className={clsx(
                                    "btn-secondary flex-1",
                                    errors.initialDepositBank && "border-red-500"
                                  )}
                                >
                                  {form.initialDepositBankName || "Select Bank"}
                                </button>
                              </div>
                              {errors.initialDepositBank && (
                                <p className="text-sm text-red-500 mt-1">
                                  {errors.initialDepositBank}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                        <div className="mt-4">
                          <label className="label">Balance Due (₹)</label>
                          <input
                            type="text"
                            readOnly
                            className="input bg-amber-50 font-bold text-slate-800"
                            value={`₹${Math.max(0, balanceDue).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {tab === "installments" && (
                  <div className="md:col-span-2 space-y-6">
                    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-base font-bold text-slate-800">
                          Extra Installments (Split Payments)
                        </h3>
                        <button
                          type="button"
                          onClick={() =>
                            setForm({
                              ...form,
                              extraInstallments: [
                                ...(form.extraInstallments || []),
                                {
                                  date: "",
                                  amount: "",
                                  bankAccountId: null,
                                  bankName: "",
                                  note: "",
                                },
                              ],
                            })
                          }
                          className="btn-primary flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" /> Add Payment
                        </button>
                      </div>
                      <p className="text-sm text-slate-500 mb-4">
                        {isSavedRecord &&
                          "Saved payments are read-only; you can only add new ones."}
                      </p>
                      <div className="space-y-4">
                        {(form.extraInstallments || []).length === 0 ? (
                          <p className="text-sm text-slate-400 py-6 text-center">
                            No payments added yet. Click &quot;+ Add Payment&quot; to add one.
                          </p>
                        ) : (
                          (form.extraInstallments || []).map((row, idx) => {
                            const rowIsSaved =
                              isSavedRecord && idx < savedExtraInstallmentsCount;
                            return (
                              <div
                                key={idx}
                                className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 rounded-xl border border-gray-100 bg-gray-50/50 items-end"
                              >
                                <div className="md:col-span-2">
                                  <label className="label text-xs">Date</label>
                                  <input
                                    type="date"
                                    readOnly={rowIsSaved}
                                    className="input"
                                    value={row.date}
                                    onChange={(e) => {
                                      const next = [
                                        ...(form.extraInstallments || []),
                                      ];
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
                                      const next = [
                                        ...(form.extraInstallments || []),
                                      ];
                                      next[idx] = {
                                        ...next[idx],
                                        amount: e.target.value,
                                      };
                                      setForm({ ...form, extraInstallments: next });
                                    }}
                                  />
                                </div>
                                <div className="md:col-span-3">
                                  <label className="label text-xs">Bank Account</label>
                                  <button
                                    ref={
                                      firstInvalidBankKey === `installmentBank_${idx}`
                                        ? firstInvalidBankRef
                                        : null
                                    }
                                    type="button"
                                    disabled={rowIsSaved}
                                    onClick={() => {
                                      setBankModalFor({
                                        type: "installment",
                                        index: idx,
                                      });
                                      setBankModalOpen(true);
                                    }}
                                    className={clsx(
                                      "input w-full text-left truncate bg-white",
                                      errors[`installmentBank_${idx}`] && "border-red-500"
                                    )}
                                  >
                                    {row.bankName || "Select Bank"}
                                  </button>
                                  {errors[`installmentBank_${idx}`] && (
                                    <p className="text-sm text-red-500 mt-1">
                                      {errors[`installmentBank_${idx}`]}
                                    </p>
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
                                      const next = [
                                        ...(form.extraInstallments || []),
                                      ];
                                      next[idx] = { ...next[idx], note: e.target.value };
                                      setForm({ ...form, extraInstallments: next });
                                    }}
                                  />
                                </div>
                                <div className="md:col-span-2 flex justify-end">
                                  {!rowIsSaved && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setForm({
                                          ...form,
                                          extraInstallments: (
                                            form.extraInstallments || []
                                          ).filter((_, i) => i !== idx),
                                        })
                                      }
                                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                    >
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
                      <label className="label">Staff</label>
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
                      <label className="label">Department</label>
                      <input
                        className="input"
                        placeholder="e.g. Ops"
                        value={form.department}
                        onChange={(e) =>
                          setForm({ ...form, department: e.target.value })
                        }
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="label">Internal Notes</label>
                      <textarea
                        className="input min-h-[120px]"
                        placeholder="Add specific details about this expense..."
                        value={form.notes}
                        onChange={(e) =>
                          setForm({ ...form, notes: e.target.value })
                        }
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Bank selection modal */}
            {bankModalOpen && (
              <div className="absolute inset-0 bg-slate-900/60 z-10 flex items-center justify-center p-4 rounded-2xl">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800">
                      Select Bank Account
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setBankModalOpen(false);
                        setBankModalFor(null);
                      }}
                      className="p-2 text-slate-400 hover:text-slate-600 rounded-full"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="overflow-y-auto p-4 space-y-2">
                    {bankAccounts.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        No bank accounts found. Add one in Bank Accounts.
                      </p>
                    ) : (
                      bankAccounts.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => {
                            const name = `${b.bankName} - ${b.accountNumber}`;
                            if (bankModalFor === "initial") {
                              setForm((prev) => ({
                                ...prev,
                                initialDepositBankId: b.id,
                                initialDepositBankName: name,
                              }));
                              setErrors((prev) => {
                                const next = { ...prev };
                                delete next.initialDepositBank;
                                return next;
                              });
                            } else if (
                              bankModalFor?.type === "installment" &&
                              typeof bankModalFor.index === "number"
                            ) {
                              const idx = bankModalFor.index;
                              const next = [...(form.extraInstallments || [])];
                              next[idx] = {
                                ...next[idx],
                                bankAccountId: b.id,
                                bankName: name,
                              };
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
                          <span className="font-medium text-slate-800">
                            {b.bankName} - {b.accountNumber}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Add Category modal */}
            {addCategoryModalOpen && (
              <div className="absolute inset-0 bg-slate-900/60 z-10 flex items-center justify-center p-4 rounded-2xl">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col">
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800">
                      Add New Category
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setAddCategoryModalOpen(false);
                        setNewCategoryName("");
                      }}
                      className="p-2 text-slate-400 hover:text-slate-600 rounded-full"
                    >
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
                    <button
                      type="button"
                      onClick={() => {
                        setAddCategoryModalOpen(false);
                        setNewCategoryName("");
                      }}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!newCategoryName.trim() || addCategorySaving}
                      className="btn-primary"
                      onClick={async () => {
                        const name = newCategoryName.trim();
                        if (!name) return;
                        setAddCategorySaving(true);
                        try {
                          const created = await createExpenseCategory(name);
                          const list = await getExpenseCategories();
                          setExpenseCategories(list);
                          setForm((prev) => ({ ...prev, category: created.name }));
                          setAddCategoryModalOpen(false);
                          setNewCategoryName("");
                          toast.success("Category added");
                        } catch (e) {
                          toast.error(
                            e.response?.data?.message || "Failed to add category"
                          );
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

            {/* Manage Categories modal */}
            {manageCategoriesModalOpen && (
              <div className="absolute inset-0 bg-slate-900/60 z-10 flex items-center justify-center p-4 rounded-2xl">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800">
                      Manage Categories
                    </h3>
                    <button
                      type="button"
                      onClick={() => setManageCategoriesModalOpen(false)}
                      className="p-2 text-slate-400 hover:text-slate-600 rounded-full"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="overflow-y-auto p-4 space-y-2">
                    {expenseCategories.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        No categories yet. Add one from the dropdown.
                      </p>
                    ) : (
                      expenseCategories.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/50"
                        >
                          <span className="font-medium text-slate-800">{c.name}</span>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await deleteExpenseCategory(c.id);
                                const list = await getExpenseCategories();
                                setExpenseCategories(list);
                                if (form.category === c.name)
                                  setForm((prev) => ({ ...prev, category: "" }));
                                toast.success("Category removed");
                              } catch (e) {
                                toast.error(
                                  e.response?.data?.message || "Failed to delete"
                                );
                              }
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
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

            <div className="flex justify-end gap-3 p-4 md:p-6 border-t border-gray-100 bg-white flex-shrink-0">
              <button onClick={() => setOpenForm(false)} className="btn-secondary" disabled={isSaving}>
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
