import { useEffect, useState, useMemo } from "react";
import { 
  Eye, Edit2, Trash2, Plus, Download, Search, X, Check, Landmark, Wallet, 
  TrendingDown, AlertCircle, ShoppingCart, Loader2, Save, Layers, User, 
  Building2, Calendar as CalendarIcon, Filter, CreditCard, Banknote, 
  CheckCircle2, ChevronDown, ChevronRight, MapPin, Briefcase
} from "lucide-react";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { exportToCSV } from "../utils/csvExport";

import { createExpense, updateExpense, deleteExpense } from "../services/expenseService";
import { getBankAccounts } from "../services/bankAccountService";
import { getExpenseCategories, createExpenseCategory, deleteExpenseCategory } from "../services/expenseCategoryService";
import { useExpenseList, useExpenseSummary } from "../hooks/useApiQueries";
import { queryKeys } from "../query/queryKeys";
import clsx from "clsx";
import PageHeader from "../components/ui/PageHeader";
import EmptyState from "../components/ui/EmptyState";
import { FilterSelect, ClearFiltersButton } from "../components/ui/FilterControls";
import { TableSectionHeader, TablePagination } from "../components/ui/DataTableSection";
import { ActionIconButton } from "../components/ui/TableRowActions";
import SlideOver from "../components/ui/SlideOver";

const emptyForm = {
  vendor: "",
  expenseType: "",
  project: "",
  category: "",
  billNo: "",
  amount: "",
  method: "Other",
  transactionId: "",
  bank: "",
  bankAccountId: null,
  paidDate: "",
  status: "Paid",
  staff: "",
  department: "",
  notes: "",
  description: "",
  referenceNumber: "",
  location: "",
  discount: "0",
  gstAmount: "0",
  initialDepositEnabled: false,
  initialDepositAmount: "",
  initialDepositBankId: null,
  initialDepositBankName: "",
  extraInstallments: [],
};

const ExpenseForm = ({ isOpen, onClose, expense, onSave, bankAccounts = [], expenseCategories = [], onAddCategory }) => {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [tab, setTab] = useState("basic");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (expense) {
      const extra = Array.isArray(expense.extraInstallments) ? expense.extraInstallments : [];
      const hasInitial = expense.initialDepositAmount != null && expense.initialDepositAmount !== "" && parseFloat(expense.initialDepositAmount) > 0;
      setForm({
        ...emptyForm,
        ...expense,
        discount: expense.discountAmount != null && expense.discountAmount !== "" ? String(expense.discountAmount) : "0",
        gstAmount: expense.gstAmount != null && expense.gstAmount !== "" ? String(expense.gstAmount) : "0",
        initialDepositEnabled: !!hasInitial,
        initialDepositAmount: hasInitial ? String(expense.initialDepositAmount) : "",
        extraInstallments: extra.map(i => ({ ...i, bankName: i.bankName || getBankDisplayName(i.bankAccountId) })),
      });
    } else {
      setForm(emptyForm);
    }
    setTab("basic");
    setErrors({});
  }, [expense, isOpen]);

  const getBankDisplayName = (bankId) => {
    const b = bankAccounts.find((x) => x.id === bankId);
    return b ? `${b.bankName} - ${b.accountNumber}` : "";
  };

  const validate = () => {
    const e = {};
    if (!form.vendor) e.vendor = "Vendor is required";
    if (!form.expenseType) e.expenseType = "Expense type is required";
    if (!form.amount) e.amount = "Base amount is required";
    if (form.initialDepositEnabled && (parseFloat(form.initialDepositAmount) || 0) > 0 && !form.initialDepositBankId) {
      e.initialDepositBank = "Select bank for advance payment";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSaving(true);
    try {
      await onSave(form);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const subtotal = parseFloat(form.amount) || 0;
  const discountVal = parseFloat(form.discount) || 0;
  const taxVal = parseFloat(form.gstAmount) || 0;
  const totalAmount = subtotal - discountVal + taxVal;

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
      title={expense ? 'Edit Expense' : 'Record New Expense'}
      footer={(
        <div className="flex justify-between items-center w-full px-1">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Total Outflow</span>
            <span className="text-[18px] font-black text-slate-900 leading-none">₹{totalAmount.toLocaleString()}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-[13px] font-bold text-slate-600 hover:bg-slate-100 rounded transition-colors">Cancel</button>
            <button onClick={handleSubmit} disabled={isSaving} className="px-6 py-2 bg-rose-600 text-white text-[13px] font-bold rounded hover:bg-rose-700 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-rose-500/20">
              {isSaving && <Loader2 size={16} className="animate-spin" />}
              {expense ? 'Save Changes' : 'Record Expense'}
            </button>
          </div>
        </div>
      )}
    >
      <div className="flex bg-slate-50 p-1 rounded-md mb-6 sticky top-0 z-10 border border-slate-200">
        {['basic', 'financial', 'installments', 'internal'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              "flex-1 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider transition-all",
              tab === t ? "bg-white text-rose-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {tab === 'basic' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <Label required>Vendor / Beneficiary</Label>
              <input className={inputCls} placeholder="e.g. Amazon Web Services" value={form.vendor} onChange={e => setForm({ ...form, vendor: e.target.value })} />
              {errors.vendor && <p className="text-[10px] text-rose-500 mt-1 font-bold">{errors.vendor}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label required>Expense Type</Label>
                <input className={inputCls} placeholder="e.g. Infrastructure" value={form.expenseType} onChange={e => setForm({ ...form, expenseType: e.target.value })} />
                {errors.expenseType && <p className="text-[10px] text-rose-500 mt-1 font-bold">{errors.expenseType}</p>}
              </div>
              <div>
                <Label>Category</Label>
                <div className="flex gap-1">
                  <select className={clsx(inputCls, "flex-1")} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                    <option value="">Select category</option>
                    {expenseCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                  <button onClick={() => {
                    const name = prompt('New category name:');
                    if (name) onAddCategory(name);
                  }} className="p-2 bg-slate-50 border border-slate-200 rounded hover:bg-slate-100"><Plus size={16}/></button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label required>Subtotal Amount (₹)</Label>
                <input type="number" className={clsx(inputCls, "font-bold text-slate-900")} placeholder="0.00" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                {errors.amount && <p className="text-[10px] text-rose-500 mt-1 font-bold">{errors.amount}</p>}
              </div>
              <div>
                <Label>Bill / Ref No</Label>
                <input className={inputCls} placeholder="Optional" value={form.billNo} onChange={e => setForm({ ...form, billNo: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <textarea className={clsx(inputCls, "min-h-[80px] resize-none")} placeholder="Expenditure details..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
        )}

        {tab === 'financial' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-slate-900 rounded-xl p-4 text-white">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Cost Breakdown</p>
              <div className="space-y-2">
                <div className="flex justify-between text-[12px]"><span>Subtotal</span><span className="font-mono">₹{subtotal.toLocaleString()}</span></div>
                {discountVal > 0 && <div className="flex justify-between text-[12px] text-emerald-400"><span>Discount</span><span className="font-mono">- ₹{discountVal.toLocaleString()}</span></div>}
                {taxVal > 0 && <div className="flex justify-between text-[12px] text-rose-400"><span>GST / Tax</span><span className="font-mono">+ ₹{taxVal.toLocaleString()}</span></div>}
                <div className="flex justify-between text-[16px] font-black border-t border-slate-700 pt-2 mt-2"><span>Total Amount</span><span className="text-rose-400">₹{totalAmount.toLocaleString()}</span></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Discount (₹)</Label>
                <input type="number" className={inputCls} placeholder="0.00" value={form.discount} onChange={e => setForm({ ...form, discount: e.target.value })} />
              </div>
              <div>
                <Label>GST Amount (₹)</Label>
                <input type="number" className={inputCls} placeholder="0.00" value={form.gstAmount} onChange={e => setForm({ ...form, gstAmount: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Method</Label>
                <select className={inputCls} value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}>
                  {['Bank Transfer', 'UPI', 'Cash', 'Cheque', 'Card', 'Other'].map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <Label>Status</Label>
                <select className={inputCls} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  {['Paid', 'Pending', 'Partial', 'Overdue'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Payment Date</Label>
                <input type="date" className={inputCls} value={form.paidDate} onChange={e => setForm({ ...form, paidDate: e.target.value })} />
              </div>
              <div>
                <Label>Transaction ID</Label>
                <input className={inputCls} placeholder="UTR / Ref" value={form.transactionId} onChange={e => setForm({ ...form, transactionId: e.target.value })} />
              </div>
            </div>
            <div className={clsx("p-3 rounded-xl border-2 transition-all", form.initialDepositEnabled ? "bg-rose-50 border-rose-200" : "bg-slate-50 border-slate-100 hover:border-slate-200 cursor-pointer")} onClick={() => !form.initialDepositEnabled && setForm({ ...form, initialDepositEnabled: true })}>
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={form.initialDepositEnabled} onChange={e => setForm({ ...form, initialDepositEnabled: e.target.checked })} className="rounded border-slate-300 text-rose-600 focus:ring-rose-500" />
                <div>
                  <p className="text-[13px] font-bold text-slate-800 leading-none">Record advance payment</p>
                  <p className="text-[11px] text-slate-500 mt-1">Paid a deposit upfront for this expense</p>
                </div>
              </div>
              {form.initialDepositEnabled && (
                <div className="mt-4 grid grid-cols-2 gap-3 animate-in slide-in-from-top-2 duration-200">
                  <div>
                    <Label>Advance (₹)</Label>
                    <input type="number" className={inputCls} value={form.initialDepositAmount} onChange={e => setForm({ ...form, initialDepositAmount: e.target.value })} />
                  </div>
                  <div>
                    <Label>Paid From</Label>
                    <select className={inputCls} value={form.initialDepositBankId} onChange={e => {
                      const b = bankAccounts.find(x => x.id === parseInt(e.target.value));
                      setForm({ ...form, initialDepositBankId: e.target.value, initialDepositBankName: b ? `${b.bankName} - ${b.accountNumber}` : '' });
                    }}>
                      <option value="">Select Bank</option>
                      {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'installments' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Disbursement Schedule</h4>
              <button onClick={() => setForm({ ...form, extraInstallments: [...form.extraInstallments, { date: '', amount: '', bankAccountId: null, bankName: '', note: '' }] })} className="text-[12px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"><Plus size={14}/> Add Row</button>
            </div>
            <div className="space-y-2">
              {form.extraInstallments.length === 0 ? (
                <div className="py-12 border border-dashed border-slate-200 rounded-xl text-center">
                  <Layers size={24} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-[12px] text-slate-400">No installments defined.</p>
                </div>
              ) : form.extraInstallments.map((row, idx) => (
                <div key={idx} className="bg-white border border-slate-200 rounded-xl p-3 space-y-3 relative group">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Date</Label>
                      <input type="date" className={inputCls} value={row.date} onChange={e => {
                        const n = [...form.extraInstallments];
                        n[idx].date = e.target.value;
                        setForm({ ...form, extraInstallments: n });
                      }} />
                    </div>
                    <div>
                      <Label>Amount (₹)</Label>
                      <input type="number" className={inputCls} value={row.amount} onChange={e => {
                        const n = [...form.extraInstallments];
                        n[idx].amount = e.target.value;
                        setForm({ ...form, extraInstallments: n });
                      }} />
                    </div>
                  </div>
                  <div>
                    <Label>Bank Account</Label>
                    <select className={inputCls} value={row.bankAccountId} onChange={e => {
                      const b = bankAccounts.find(x => x.id === parseInt(e.target.value));
                      const n = [...form.extraInstallments];
                      n[idx].bankAccountId = e.target.value;
                      n[idx].bankName = b ? `${b.bankName} - ${b.accountNumber}` : '';
                      setForm({ ...form, extraInstallments: n });
                    }}>
                      <option value="">Select Bank</option>
                      {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber}</option>)}
                    </select>
                  </div>
                  <button onClick={() => setForm({ ...form, extraInstallments: form.extraInstallments.filter((_, i) => i !== idx) })} className="absolute -top-2 -right-2 h-6 w-6 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center hover:bg-rose-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100 shadow-sm"><Trash2 size={12}/></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'internal' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Assigned Staff</Label>
                <input className={inputCls} value={form.staff} onChange={e => setForm({ ...form, staff: e.target.value })} />
              </div>
              <div>
                <Label>Department</Label>
                <input className={inputCls} value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Location</Label>
                <input className={inputCls} value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
              </div>
              <div>
                <Label>Internal Ref</Label>
                <input className={inputCls} value={form.referenceNumber} onChange={e => setForm({ ...form, referenceNumber: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Internal Notes</Label>
              <textarea className={clsx(inputCls, "min-h-[100px]")} placeholder="Private notes for auditing..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
        )}
      </div>
    </SlideOver>
  );
};

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

export default function Expense() {
  const [bankAccounts, setBankAccounts] = useState([]);
  const [openForm, setOpenForm] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewDetail, setViewDetail] = useState(null);
  const [editExpense, setEditExpense] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [bankFilter, setBankFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [expenseCategories, setExpenseCategories] = useState([]);

  const queryClient = useQueryClient();

  const filters = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    let date_from = undefined;
    let date_to = undefined;
    if (dateFilter === "Today") {
      date_from = today;
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

  const { data: expenseResult, isLoading: expenseLoading } = useExpenseList(filters);
  const { data: expenseSummary } = useExpenseSummary(useMemo(() => {
    const { page, per_page, ...rest } = filters;
    return rest;
  }, [filters]));

  const expenseRecords = Array.isArray(expenseResult?.data) ? expenseResult.data : [];
  const expenseMeta = expenseResult?.meta ?? null;

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    getBankAccounts().then(setBankAccounts);
    getExpenseCategories().then(setExpenseCategories);
  }, []);

  const handleSave = async (formData) => {
    try {
      if (editExpense) {
        await updateExpense(editExpense.id, formData);
        toast.success("Expense updated");
      } else {
        await createExpense(formData);
        toast.success("Expense recorded");
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.expense.all });
      setOpenForm(false);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to save expense");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Purge this expense record?")) return;
    try {
      await deleteExpense(id);
      toast.success("Expense purged");
      queryClient.invalidateQueries({ queryKey: queryKeys.expense.all });
    } catch (e) {
      toast.error("Operation failed");
    }
  };

  const openViewModal = (expense) => {
    setViewDetail(expense);
    setViewModalOpen(true);
  };

  const handleAddCategory = async (name) => {
    try {
      await createExpenseCategory(name);
      const list = await getExpenseCategories();
      setExpenseCategories(list);
      toast.success("Category added");
    } catch (e) {
      toast.error("Failed to add category");
    }
  };

  return (
    <div className="p-4 md:p-8 animate-fade-in space-y-6 md:space-y-8">
      <PageHeader
        title="Expense Tracking"
        subtitle="Monitor organizational expenditures and vendor settlements"
        primaryAction={(
          <button onClick={() => { setEditExpense(null); setOpenForm(true); }} className="btn-primary flex items-center gap-2 shadow-lg shadow-indigo-500/20">
            <Plus size={18} />
            <span>Record Expense</span>
          </button>
        )}
        secondaryActions={(
          <button onClick={() => exportToCSV(expenseRecords, "expense_export")} className="p-2 bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-50 shadow-sm"><Download size={18} /></button>
        )}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Burn" value={`₹${Number(expenseSummary?.totalExpense || 0).toLocaleString()}`} icon={Wallet} colorClass="bg-slate-800" />
        <StatCard title="Settled" value={`₹${Number(expenseSummary?.totalPaid || 0).toLocaleString()}`} icon={TrendingDown} colorClass="bg-rose-600" />
        <StatCard title="Outstanding" value={`₹${Number(expenseSummary?.totalBalance || 0).toLocaleString()}`} icon={AlertCircle} colorClass="bg-amber-600" />
        <StatCard title="Total Entries" value={expenseMeta?.total || 0} icon={ShoppingCart} colorClass="bg-indigo-600" />
      </div>

      <div className="bg-white/80 backdrop-blur-md px-4 py-3 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-3 sticky top-4 z-20">
        <div className="flex-1 min-w-[240px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search by ID, vendor, or category..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[13px] font-medium outline-none focus:bg-white focus:border-indigo-500 transition-all shadow-inner"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <FilterSelect icon={CheckCircle2} value={statusFilter} onChange={setStatusFilter}>
            <option value="All">All Status</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Partial">Partial</option>
            <option value="Overdue">Overdue</option>
          </FilterSelect>
          <button onClick={() => setShowAdvancedFilters(!showAdvancedFilters)} className={clsx("p-2 border rounded-lg transition-all shadow-sm", showAdvancedFilters ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "bg-white border-slate-200 text-slate-600")}><Filter size={18} /></button>
          {(searchQuery || statusFilter !== "All" || categoryFilter || bankFilter || dateFilter !== "All") && <ClearFiltersButton onClick={() => { setSearchQuery(""); setStatusFilter("All"); setCategoryFilter(""); setBankFilter(""); setDateFilter("All"); }} />}
        </div>
      </div>

      {showAdvancedFilters && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-2">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Category Filter</label>
            <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[13px] font-medium" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
              <option value="">All Categories</option>
              {expenseCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Source Account</label>
            <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[13px] font-medium" value={bankFilter} onChange={e => setBankFilter(e.target.value)}>
              <option value="">All Accounts</option>
              {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Spending Window</label>
            <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[13px] font-medium" value={dateFilter} onChange={e => setDateFilter(e.target.value)}>
              <option value="All">All Time</option>
              <option value="Today">Today</option>
              <option value="This Month">This Month</option>
              <option value="This Year">This Year</option>
            </select>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <TableSectionHeader title="Expense Journal" summary={`${expenseMeta?.total || 0} entries found`} />
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Expense Ref</th>
                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Vendor / Category</th>
                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">Settled Amount</th>
                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Method</th>
                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Date</th>
                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenseLoading ? (
                <tr><td colSpan="6" className="p-12 text-center text-slate-400 font-medium">Synchronizing records...</td></tr>
              ) : expenseRecords.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-mono text-[11px] font-bold text-slate-400">#{item.id}</span>
                      <span className="text-[13px] font-bold text-slate-900 truncate max-w-[180px]">{item.expenseType || 'General Expense'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col leading-none">
                      <span className="text-[13px] font-bold text-slate-800">{item.vendor || '—'}</span>
                      <span className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-wider">{item.category || 'Uncategorized'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-mono text-[14px] font-black text-rose-600 italic">
                      ₹{parseFloat(item.totalAmount || item.amount || 0).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                      <span className="text-[12px] font-bold text-slate-600">{item.method || 'Other'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col leading-none">
                      <span className="text-[12px] font-bold text-slate-800">{item.paidDate || '—'}</span>
                      {item.billNo && <span className="text-[10px] text-slate-400 font-medium mt-1">Bill: {item.billNo}</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                      <ActionIconButton onClick={() => openViewModal(item)} title="View Detail" icon={Eye} tone="view" />
                      <ActionIconButton onClick={() => { setEditExpense(item); setOpenForm(true); }} title="Edit Record" icon={Edit2} tone="edit" />
                      <ActionIconButton onClick={() => handleDelete(item.id)} title="Purge Record" icon={Trash2} tone="delete" />
                    </div>
                  </td>
                </tr>
              ))}
              {!expenseLoading && expenseRecords.length === 0 && (
                <tr><td colSpan="6" className="p-20"><EmptyState icon={ShoppingCart} title="No Expenses Logged" description="No expenditure entries found matching your current filter criteria." /></td></tr>
              )}
            </tbody>
          </table>
        </div>
        {expenseMeta && <TablePagination summary={`Showing ${expenseRecords.length} of ${expenseMeta.total} entries`} onPrevious={() => setCurrentPage(p => Math.max(1, p - 1))} onNext={() => setCurrentPage(p => p + 1)} previousDisabled={expenseMeta.current_page <= 1} nextDisabled={expenseMeta.current_page >= expenseMeta.last_page} />}
      </div>

      <ExpenseForm
        isOpen={openForm}
        onClose={() => setOpenForm(false)}
        expense={editExpense}
        onSave={handleSave}
        bankAccounts={bankAccounts}
        expenseCategories={expenseCategories}
        onAddCategory={handleAddCategory}
      />

      <SlideOver
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title="Expenditure Intelligence"
        footer={<div className="flex justify-end w-full px-2"><button onClick={() => setViewModalOpen(false)} className="px-6 py-2 bg-slate-900 text-white text-[13px] font-bold rounded-xl hover:bg-black transition-colors">Dismiss Detail</button></div>}
      >
        {viewDetail && (
          <div className="space-y-8">
            <div className="flex items-center gap-5 p-6 bg-slate-900 rounded-2xl text-white relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-10"><ShoppingCart size={120} /></div>
               <div className="relative z-10">
                 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400 mb-1">Payment Receipt</p>
                 <h3 className="text-[24px] font-black tracking-tight">{viewDetail.expenseType || 'General Expense'}</h3>
                 <p className="text-[12px] text-slate-400 font-medium mt-1">Transaction ID: <span className="font-mono">{viewDetail.transactionId || 'N/A'}</span></p>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-8 px-2">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Beneficiary</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center font-black">{viewDetail.vendor?.[0]}</div>
                  <p className="text-[15px] font-bold text-slate-800">{viewDetail.vendor || '—'}</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Net Outflow</p>
                <p className="text-[22px] font-black text-rose-600 font-mono italic leading-none">₹{parseFloat(viewDetail.totalAmount || viewDetail.amount || 0).toLocaleString()}</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-5">
               <div className="grid grid-cols-2 gap-6">
                 <div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Settlement Mode</p>
                   <p className="text-[13px] font-bold text-slate-800 flex items-center gap-1.5"><CreditCard size={14} className="text-slate-400"/> {viewDetail.method || 'Standard'}</p>
                 </div>
                 <div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Payment Account</p>
                   <p className="text-[13px] font-bold text-slate-800 flex items-center gap-1.5"><Landmark size={14} className="text-slate-400"/> {viewDetail.bank || 'Main Treasury'}</p>
                 </div>
               </div>
               <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-200/60">
                 <div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Execution Time</p>
                   <p className="text-[13px] font-bold text-slate-800">{viewDetail.paidDate || '—'}</p>
                 </div>
                 <div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Status</p>
                   <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded text-[10px] font-black uppercase tracking-wider">{viewDetail.status || 'Verified'}</span>
                 </div>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-6 px-2">
               <div>
                 <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Reporting Staff</p>
                 <p className="text-[13px] font-bold text-slate-800 flex items-center gap-1.5"><User size={14} className="text-slate-400"/> {viewDetail.staff || 'System Admin'}</p>
               </div>
               <div>
                 <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Department</p>
                 <p className="text-[13px] font-bold text-slate-800 flex items-center gap-1.5"><Briefcase size={14} className="text-slate-400"/> {viewDetail.department || 'Operations'}</p>
               </div>
            </div>

            {(viewDetail.description || viewDetail.notes) && (
              <div className="px-2 space-y-4">
                {viewDetail.description && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Operational Context</p>
                    <div className="p-4 bg-white border border-slate-100 rounded-xl text-[13px] text-slate-600 leading-relaxed shadow-sm italic">
                      "{viewDetail.description}"
                    </div>
                  </div>
                )}
                {viewDetail.notes && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Audit Annotations</p>
                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-[13px] text-amber-700 font-medium">
                      {viewDetail.notes}
                    </div>
                  </div>
                )}
              </div>
            )}

            {viewDetail.extraInstallments?.length > 0 && (
              <div className="px-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Installment Breakdown</p>
                <div className="space-y-2">
                  {viewDetail.extraInstallments.map((inst, i) => (
                    <div key={i} className="flex justify-between items-center p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-rose-200 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-50 rounded flex items-center justify-center text-[11px] font-bold text-slate-400 group-hover:bg-rose-50 group-hover:text-rose-600">#{i+1}</div>
                        <div className="flex flex-col">
                          <span className="text-[13px] font-bold text-slate-800">{inst.date}</span>
                          <span className="text-[11px] text-slate-500 font-medium">{inst.bankName}</span>
                        </div>
                      </div>
                      <span className="font-mono text-[14px] font-black text-slate-900">₹{parseFloat(inst.amount).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </SlideOver>
    </div>
  );
}
