import { useEffect, useState, useRef, useMemo } from "react";
import { 
  Eye, Edit2, Trash2, Plus, Download, Search, X, Check, Landmark, Wallet, 
  TrendingUp, AlertCircle, Receipt, Loader2, Save, Layers, User, Target, 
  Building2, Calendar as CalendarIcon, Phone, Mail, BadgeCheck, Activity, 
  Briefcase, Filter, MessageSquare, CreditCard, Banknote, CheckCircle2,
  ChevronDown, ChevronRight, FileText
} from "lucide-react";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { exportToCSV } from "../utils/csvExport";

import { createIncome, updateIncome, deleteIncome } from "../services/incomeService";
import { getBankAccounts } from "../services/bankAccountService";
import { getIncomeCategories, createIncomeCategory, deleteIncomeCategory } from "../services/incomeCategoryService";
import { useIncomeList, useIncomeSummary, useClients } from "../hooks/useApiQueries";
import { queryKeys } from "../query/queryKeys";
import clsx from "clsx";
import { TableSkeleton } from "../components/Skeleton";
import PageHeader from "../components/ui/PageHeader";
import ToolbarSearch from "../components/ui/ToolbarSearch";
import EmptyState from "../components/ui/EmptyState";
import { FilterSelect, ClearFiltersButton } from "../components/ui/FilterControls";
import { TableSectionHeader, TablePagination } from "../components/ui/DataTableSection";
import { ActionIconButton } from "../components/ui/TableRowActions";
import SlideOver from "../components/ui/SlideOver";

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
  autoCalculateAmount: true,
  discount: "",
  taxAmount: "",
  initialDepositEnabled: false,
  initialDepositAmount: "",
  initialDepositBankId: null,
  initialDepositBankName: "",
  extraInstallments: [],
};

const IncomeForm = ({ isOpen, onClose, income, onSave, clients = [], bankAccounts = [], incomeCategories = [], onAddCategory }) => {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [tab, setTab] = useState("basic");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (income) {
      const extra = Array.isArray(income.extraInstallments) ? income.extraInstallments : [];
      const hasInitial = income.initialDepositAmount != null && income.initialDepositAmount !== "" && parseFloat(income.initialDepositAmount) > 0;
      setForm({
        ...emptyForm,
        ...income,
        discount: income.discountAmount != null && income.discountAmount !== "" ? String(income.discountAmount) : "",
        taxAmount: income.gstAmount != null && income.gstAmount !== "" ? String(income.gstAmount) : "",
        initialDepositEnabled: !!hasInitial,
        initialDepositAmount: hasInitial ? String(income.initialDepositAmount) : "",
        extraInstallments: extra.map(i => ({ ...i, bankName: i.bankName || getBankDisplayName(i.bankAccountId) })),
      });
    } else {
      setForm(emptyForm);
    }
    setTab("basic");
    setErrors({});
  }, [income, isOpen]);

  const getBankDisplayName = (bankId) => {
    const b = bankAccounts.find((x) => x.id === bankId);
    return b ? `${b.bankName} - ${b.accountNumber}` : "";
  };

  const validate = () => {
    const e = {};
    if (!form.client) e.client = "Client is required";
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
  const taxVal = parseFloat(form.taxAmount) || 0;
  const totalAmount = subtotal - discountVal + taxVal;

  const TABS = [
    { id: 'basic', label: 'Basic Info', icon: Target },
    { id: 'financial', label: 'Financial Info', icon: Wallet },
    { id: 'installments', label: 'Payment Milestones', icon: Layers },
    { id: 'internal', label: 'Notes', icon: Briefcase },
  ];

  const Label = ({ children, required }) => (
    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
      {children} {required && <span className="text-rose-500">*</span>}
    </label>
  );

  const inputCls = "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm";

  return (
    <SlideOver
      isOpen={isOpen}
      onClose={onClose}
      size="5xl"
      title={income ? 'Edit Income' : 'New Income'}
      footer={(
        <div className="flex justify-between items-center w-full px-1">
          <div className="flex items-center gap-8">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Value</span>
              <span className="text-[24px] font-black text-emerald-600 font-mono italic leading-none mt-1">₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-6 py-2.5 text-[14px] font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-all">Cancel</button>
            <button onClick={handleSubmit} disabled={isSaving} className="px-10 py-2.5 bg-indigo-600 text-white text-[14px] font-black rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all">
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              <span>{isSaving ? 'Saving...' : (income ? 'Save Changes' : 'Record Income')}</span>
            </button>
          </div>
        </div>
      )}
    >
      <div className="flex h-full min-h-[600px] relative">
        {/* Sidebar Navigation */}
        <div className="w-64 border-r-2 border-slate-100 pr-6 shrink-0 hidden md:block">
          <div className="flex flex-col gap-2 sticky top-0">
            {TABS.map((t, idx) => (
              <div key={t.id}>
                <button
                  onClick={() => setTab(t.id)}
                  className={clsx(
                    "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-[0.15em] transition-all relative group",
                    tab === t.id
                      ? "bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100 ring-1 ring-indigo-200/50"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  {tab === t.id && (
                    <div className="absolute -right-[26px] top-3 bottom-3 w-1 bg-indigo-600 rounded-l-full z-10" />
                  )}
                  <t.icon className={clsx("h-4 w-4", tab === t.id ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600")} />
                  <span>{t.label}</span>
                </button>
                {idx < TABS.length - 1 && <div className="h-px bg-slate-50 mx-4 my-1 opacity-50" />}
              </div>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 pl-10 overflow-y-auto">
          <div className="pb-20">
            {tab === 'basic' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="grid grid-cols-2 gap-8">
                  <div className="col-span-2">
                    <Label required>Customer</Label>
                    <div className="relative">
                      <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <select className={clsx(inputCls, "pl-11 appearance-none")} value={form.client} onChange={e => setForm({ ...form, client: e.target.value })}>
                        <option value="">Select customer...</option>
                        {clients.map(c => <option key={c.id} value={c.company_name || c.client_name}>{c.company_name || c.client_name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <Label required>Income Title / Source</Label>
                    <input className={inputCls} placeholder="e.g. Consulting Services" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <div className="flex gap-2">
                      <select className={clsx(inputCls, "flex-1 appearance-none")} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                        <option value="">Uncategorized</option>
                        {incomeCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                      <button onClick={() => {
                        const name = prompt('New category name:');
                        if (name) onAddCategory(name);
                      }} className="px-4 bg-slate-50 border border-slate-200 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 transition-all"><Plus size={18}/></button>
                    </div>
                  </div>
                  <div>
                    <Label>Invoice Number</Label>
                    <div className="relative">
                      <FileText size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input className={clsx(inputCls, "pl-11")} placeholder="INV-2024-001" value={form.invoiceNo} onChange={e => setForm({ ...form, invoiceNo: e.target.value })} />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <Label>Description</Label>
                    <textarea className={clsx(inputCls, "min-h-[120px] resize-none")} placeholder="Enter description..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                  </div>
                </div>
              </div>
            )}

            {tab === 'financial' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="bg-slate-900 rounded-3xl p-8 text-white space-y-6 relative overflow-hidden group shadow-2xl border border-slate-800">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/10 blur-[100px] rounded-full -mr-32 -mt-32 group-hover:bg-emerald-600/20 transition-colors" />
                  <div className="flex justify-between items-center relative z-10">
                    <h4 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.2em]">Financial Summary</h4>
                    <TrendingUp className="text-emerald-500" size={24} />
                  </div>
                  <div className="space-y-4 relative z-10">
                    <div className="flex justify-between items-end border-b border-slate-800 pb-4">
                      <span className="text-[11px] font-bold text-slate-400 uppercase">Subtotal</span>
                      <span className="text-[18px] font-black font-mono tracking-tight italic">₹{subtotal.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between items-end border-b border-slate-800 pb-4">
                      <span className="text-[11px] font-bold text-rose-400 uppercase tracking-widest">Discount</span>
                      <span className="text-[18px] font-black font-mono tracking-tight italic text-rose-400">- ₹{discountVal.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between items-end border-b border-slate-800 pb-4">
                      <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest">Tax</span>
                      <span className="text-[18px] font-black font-mono tracking-tight italic text-emerald-400">+ ₹{taxVal.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between items-end pt-4">
                      <span className="text-[13px] font-black text-white uppercase tracking-[0.3em]">Total</span>
                      <span className="text-[32px] font-black font-mono tracking-tighter italic text-indigo-400 leading-none">₹{totalAmount.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <Label required>Amount (₹)</Label>
                    <input type="number" className={clsx(inputCls, "font-black italic text-slate-900 text-lg")} placeholder="0.00" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Discount</Label>
                      <input type="number" className={inputCls} placeholder="0.00" value={form.discount} onChange={e => setForm({ ...form, discount: e.target.value })} />
                    </div>
                    <div>
                      <Label>Tax Amount</Label>
                      <input type="number" className={inputCls} placeholder="0.00" value={form.taxAmount} onChange={e => setForm({ ...form, taxAmount: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label>Payment Method</Label>
                    <select className={clsx(inputCls, "appearance-none")} value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}>
                      {['Bank Transfer', 'UPI', 'Cash', 'Cheque', 'Card', 'Other'].map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <select className={clsx(inputCls, "appearance-none")} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                      {['Received', 'Pending', 'Partial', 'Overdue'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label>Payment Date</Label>
                    <input type="date" className={inputCls} value={form.receivedDate} onChange={e => setForm({ ...form, receivedDate: e.target.value })} />
                  </div>
                  <div>
                    <Label>Transaction ID / Reference</Label>
                    <input className={inputCls} placeholder="Transaction ID or reference..." value={form.transactionId} onChange={e => setForm({ ...form, transactionId: e.target.value })} />
                  </div>
                </div>

                <div className={clsx("p-8 rounded-3xl border-2 transition-all group relative overflow-hidden", form.initialDepositEnabled ? "bg-indigo-50/50 border-indigo-200" : "bg-slate-50 border-slate-100 hover:border-slate-200 cursor-pointer")} onClick={() => !form.initialDepositEnabled && setForm({ ...form, initialDepositEnabled: true })}>
                  <div className="flex items-center gap-4 relative z-10">
                    <input type="checkbox" checked={form.initialDepositEnabled} onChange={e => setForm({ ...form, initialDepositEnabled: e.target.checked })} className="h-5 w-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all" />
                    <div>
                      <p className="text-[14px] font-black text-slate-900 uppercase tracking-widest leading-none">Add Advance Payment</p>
                      <p className="text-[11px] font-bold text-slate-500 mt-1 uppercase">Record advance deposit</p>
                    </div>
                  </div>
                  {form.initialDepositEnabled && (
                    <div className="mt-8 grid grid-cols-2 gap-6 animate-in slide-in-from-top-4 duration-300 relative z-10">
                      <div>
                        <Label>Advance Amount (₹)</Label>
                        <input type="number" className={clsx(inputCls, "bg-white")} value={form.initialDepositAmount} onChange={e => setForm({ ...form, initialDepositAmount: e.target.value })} />
                      </div>
                      <div>
                        <Label>Bank Account</Label>
                        <select className={clsx(inputCls, "bg-white appearance-none")} value={form.initialDepositBankId} onChange={e => {
                          const b = bankAccounts.find(x => x.id === parseInt(e.target.value));
                          setForm({ ...form, initialDepositBankId: e.target.value, initialDepositBankName: b ? `${b.bankName} - ${b.accountNumber}` : '' });
                        }}>
                          <option value="">Select bank account...</option>
                          {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber}</option>)}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'installments' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                  <div>
                    <h4 className="text-[14px] font-black text-slate-900 uppercase tracking-widest">Milestones</h4>
                    <p className="text-[11px] font-bold text-slate-400 uppercase mt-1">Upcoming or extra milestone payments</p>
                  </div>
                  <button onClick={() => setForm({ ...form, extraInstallments: [...form.extraInstallments, { date: '', amount: '', bankAccountId: null, bankName: '', note: '' }] })} className="px-6 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl text-[12px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm flex items-center gap-2 border border-indigo-100 group">
                    <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                    <span>Add Milestone</span>
                  </button>
                </div>
                
                <div className="space-y-6">
                  {form.extraInstallments.length === 0 ? (
                    <div className="py-20 border-2 border-dashed border-slate-100 rounded-3xl text-center bg-slate-50/50">
                      <Layers size={48} className="mx-auto text-slate-200 mb-4" />
                      <p className="text-[14px] font-black text-slate-400 uppercase tracking-widest">No Milestones</p>
                      <p className="text-[11px] text-slate-300 mt-1 uppercase">Add milestones for payment tracking</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-6">
                      {form.extraInstallments.map((row, idx) => (
                        <div key={idx} className="bg-slate-50/50 border border-slate-200 rounded-2xl p-6 relative group hover:border-indigo-200 transition-colors shadow-sm">
                          <div className="grid grid-cols-12 gap-6">
                            <div className="col-span-4">
                              <Label>Payment Date</Label>
                              <input type="date" className={clsx(inputCls, "bg-white")} value={row.date} onChange={e => {
                                const n = [...form.extraInstallments];
                                n[idx].date = e.target.value;
                                setForm({ ...form, extraInstallments: n });
                              }} />
                            </div>
                            <div className="col-span-4">
                              <Label>Amount (₹)</Label>
                              <input type="number" className={clsx(inputCls, "bg-white font-black italic")} value={row.amount} onChange={e => {
                                const n = [...form.extraInstallments];
                                n[idx].amount = e.target.value;
                                setForm({ ...form, extraInstallments: n });
                              }} />
                            </div>
                            <div className="col-span-4">
                              <Label>Bank Account</Label>
                              <select className={clsx(inputCls, "bg-white appearance-none")} value={row.bankAccountId} onChange={e => {
                                const b = bankAccounts.find(x => x.id === parseInt(e.target.value));
                                const n = [...form.extraInstallments];
                                n[idx].bankAccountId = e.target.value;
                                n[idx].bankName = b ? `${b.bankName} - ${b.accountNumber}` : '';
                                setForm({ ...form, extraInstallments: n });
                              }}>
                                <option value="">Select bank...</option>
                                {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber}</option>)}
                              </select>
                            </div>
                          </div>
                          <button onClick={() => setForm({ ...form, extraInstallments: form.extraInstallments.filter((_, i) => i !== idx) })} className="absolute -top-3 -right-3 h-10 w-10 bg-white text-rose-500 rounded-xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 shadow-xl border border-slate-100"><Trash2 size={18}/></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'internal' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <Label>Assigned To</Label>
                    <div className="relative">
                      <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input className={clsx(inputCls, "pl-11")} placeholder="Staff name..." value={form.staff} onChange={e => setForm({ ...form, staff: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label>Department</Label>
                    <div className="relative">
                      <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input className={clsx(inputCls, "pl-11")} placeholder="Department..." value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <Label>Follow-up Date</Label>
                    <div className="relative">
                      <CalendarIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="date" className={clsx(inputCls, "pl-11")} value={form.followUpDate} onChange={e => setForm({ ...form, followUpDate: e.target.value })} />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <Label>Notes</Label>
                    <textarea className={clsx(inputCls, "min-h-[200px] resize-none")} placeholder="Enter private notes..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </SlideOver>
  );
};

const StatCard = ({ title, value, icon: Icon, colorClass }) => (
  <div className="bg-white p-4 rounded-md border border-slate-200 shadow-sm flex items-center gap-4">
    <div className={clsx("w-10 h-10 rounded flex items-center justify-center", colorClass)}>
      <Icon size={20} className="text-white" />
    </div>
    <div>
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{title}</p>
      <p className="text-[20px] font-bold text-slate-900">{value}</p>
    </div>
  </div>
);

export default function Income() {
  const [bankAccounts, setBankAccounts] = useState([]);
  const [openForm, setOpenForm] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewDetail, setViewDetail] = useState(null);
  const [editIncome, setEditIncome] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
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
  const [incomeCategories, setIncomeCategories] = useState([]);

  const queryClient = useQueryClient();

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
  const { data: incomeSummary } = useIncomeSummary(useMemo(() => {
    const { page, per_page, ...rest } = filters;
    return rest;
  }, [filters]));
  const { data: clientsResult } = useClients({ per_page: 100 });

  const incomeRecords = Array.isArray(incomeResult?.data) ? incomeResult.data : [];
  const incomeMeta = incomeResult?.meta ?? null;
  const clients = Array.isArray(clientsResult?.data) ? clientsResult.data : [];

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    getBankAccounts().then(setBankAccounts);
    getIncomeCategories().then(setIncomeCategories);
  }, []);

  const handleSave = async (formData) => {
    try {
      if (editIncome) {
        await updateIncome(editIncome.id, formData);
        toast.success("Income updated");
      } else {
        await createIncome(formData);
        toast.success("Income recorded");
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.income.all });
      setOpenForm(false);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to save income");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this income record?")) return;
    try {
      await deleteIncome(id);
      toast.success("Income deleted");
      queryClient.invalidateQueries({ queryKey: queryKeys.income.all });
    } catch (e) {
      toast.error("Deletion failed");
    }
  };

  const openViewModal = (income) => {
    setViewDetail(income);
    setViewModalOpen(true);
  };

  const handleAddCategory = async (name) => {
    try {
      await createIncomeCategory(name);
      const list = await getIncomeCategories();
      setIncomeCategories(list);
      toast.success("Category added");
    } catch (e) {
      toast.error("Failed to add category");
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 animate-in fade-in duration-500 overflow-hidden">
      <div className="px-6 lg:px-8 pt-8 pb-6 bg-white border-b border-slate-200/60 shadow-sm relative z-10">
        <PageHeader
          title="Incomes"
          subtitle="Track and manage your incomes."
          primaryAction={(
            <button onClick={() => { setEditIncome(null); setOpenForm(true); }} className="btn-primary flex items-center gap-2 shadow-lg shadow-indigo-500/20 group">
              <div className="bg-white/20 p-1 rounded-lg group-hover:bg-white/30 transition-colors">
                <Plus size={16} />
              </div>
              <span>New Income</span>
            </button>
          )}
          secondaryActions={(
            <button onClick={() => exportToCSV(incomeRecords, "income_export")} className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 shadow-sm transition-all active:scale-95"><Download size={18} /></button>
          )}
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          <StatCard title="Total Value" value={`₹${Number(incomeSummary?.totalIncome || 0).toLocaleString()}`} icon={Wallet} colorClass="bg-slate-800" />
          <StatCard title="Received" value={`₹${Number(incomeSummary?.totalReceived || 0).toLocaleString()}`} icon={TrendingUp} colorClass="bg-emerald-600" />
          <StatCard title="Outstanding" value={`₹${Number(incomeSummary?.totalBalance || 0).toLocaleString()}`} icon={AlertCircle} colorClass="bg-amber-600" />
          <StatCard title="Total Incomes" value={incomeMeta?.total || 0} icon={Receipt} colorClass="bg-indigo-600" />
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 bg-white">
        <div className="bg-slate-50/50 px-6 lg:px-8 py-3 border-b border-slate-100 flex flex-wrap items-center gap-3 sticky top-0 z-20">
          <div className="flex-1 min-w-[240px]">
            <div className="relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
              <input
                type="text"
                placeholder="Search incomes..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <FilterSelect icon={CheckCircle2} value={statusFilter} onChange={setStatusFilter}>
              <option value="All">All Status</option>
              <option value="Received">Received</option>
              <option value="Pending">Pending</option>
              <option value="Partial">Partial</option>
              <option value="Overdue">Overdue</option>
            </FilterSelect>
            <button onClick={() => setShowAdvancedFilters(!showAdvancedFilters)} className={clsx("p-2.5 border rounded-xl transition-all shadow-sm", showAdvancedFilters ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "bg-white border-slate-200 text-slate-600")}><Filter size={18} /></button>
            {(searchQuery || statusFilter !== "All" || categoryFilter || bankFilter || dateFilter !== "All") && <ClearFiltersButton onClick={() => { setSearchQuery(""); setStatusFilter("All"); setCategoryFilter(""); setBankFilter(""); setDateFilter("All"); }} />}
          </div>
        </div>

        {showAdvancedFilters && (
          <div className="bg-white px-6 lg:px-8 py-6 border-b border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-2">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">Category</label>
              <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[13px] font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                <option value="">All Categories</option>
                {incomeCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">Bank Account</label>
              <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[13px] font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all" value={bankFilter} onChange={e => setBankFilter(e.target.value)}>
                <option value="">All Accounts</option>
                {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">Date Range</label>
              <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[13px] font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all" value={dateFilter} onChange={e => setDateFilter(e.target.value)}>
                <option value="All">All Time</option>
                <option value="Today">Today</option>
                <option value="This Month">This Month</option>
                <option value="This Year">This Year</option>
              </select>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto custom-scrollbar">
          <div className="min-w-full">
            <table className="w-full text-left border-collapse table-fixed">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 sticky top-0 z-10">
                  <th className="px-6 lg:px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-32">Ref</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Customer</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right w-44">Amount</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-40">Method</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-44">Payment Date</th>
                  <th className="px-6 lg:px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right w-40">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {incomeLoading ? (
                  <tr><td colSpan="6" className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse italic">Synchronizing Treasury Journal...</td></tr>
                ) : incomeRecords.map(item => (
                  <tr key={item.id} className="group hover:bg-slate-50/80 transition-all duration-200">
                    <td className="px-6 lg:px-8 py-5">
                      <div className="flex flex-col">
                        <span className="font-mono text-[11px] font-black text-indigo-500 italic tracking-tighter">#INC-{item.id}</span>
                        <span className="text-[13px] font-black text-slate-900 mt-1 truncate">{item.source || 'General Revenue'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center text-[12px] font-black text-slate-600 shadow-inner">
                          {item.client?.[0] || 'C'}
                        </div>
                        <span className="text-[13px] font-black text-slate-900 truncate max-w-[180px]">{item.client || '—'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <span className="font-mono text-[16px] font-black text-emerald-600 italic tracking-tight">
                        ₹{parseFloat(item.netAmount || item.amount || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200/50 w-fit">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                        <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest">{item.method || 'Standard'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col leading-none">
                        <div className="flex items-center gap-1.5 text-[12px] font-black text-slate-700">
                           <CalendarIcon size={12} className="text-slate-300" />
                           {item.receivedDate || '—'}
                        </div>
                        {item.invoiceNo && <span className="text-[10px] text-indigo-500 font-bold mt-2 flex items-center gap-1"> <Receipt size={10} /> Ref: {item.invoiceNo}</span>}
                      </div>
                    </td>
                    <td className="px-6 lg:px-8 py-5 text-right">
                      <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                        <ActionIconButton onClick={() => openViewModal(item)} title="Intelligence View" icon={Eye} tone="view" />
                        {!item.invoice_id && (
                          <>
                            <ActionIconButton onClick={() => { setEditIncome(item); setOpenForm(true); }} title="Modify Entry" icon={Edit2} tone="edit" />
                            <ActionIconButton onClick={() => handleDelete(item.id)} title="Purge Record" icon={Trash2} tone="delete" />
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!incomeLoading && incomeRecords.length === 0 && (
              <div className="p-20">
                <EmptyState icon={Receipt} title="No incomes found" description="Record a new income to get started." />
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border-t border-slate-100 px-6 lg:px-8 py-4 flex-shrink-0">
          {incomeMeta && <TablePagination summary={`Showing ${incomeRecords.length} of ${incomeMeta.total} incomes`} onPrevious={() => setCurrentPage(p => Math.max(1, p - 1))} onNext={() => setCurrentPage(p => p + 1)} previousDisabled={incomeMeta.current_page <= 1} nextDisabled={incomeMeta.current_page >= incomeMeta.last_page} />}
        </div>
      </div>

      <IncomeForm
        isOpen={openForm}
        onClose={() => setOpenForm(false)}
        income={editIncome}
        onSave={handleSave}
        clients={clients}
        bankAccounts={bankAccounts}
        incomeCategories={incomeCategories}
        onAddCategory={handleAddCategory}
      />

      <SlideOver
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title="Income Details"
        size="2xl"
        footer={<div className="flex justify-end w-full px-2"><button onClick={() => setViewModalOpen(false)} className="px-8 py-2.5 bg-slate-900 text-white text-[13px] font-black rounded-xl hover:bg-black transition-all active:scale-95 shadow-lg shadow-slate-900/10">Close</button></div>}
      >
        {viewDetail && (
          <div className="space-y-10 pb-10">
            <div className="flex items-center gap-6 p-8 bg-gradient-to-br from-slate-900 to-indigo-950 rounded-3xl text-white relative overflow-hidden shadow-2xl">
               <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12"><Wallet size={120} /></div>
               <div className="relative z-10">
                 <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Details</p>
                 </div>
                 <h3 className="text-[28px] font-black tracking-tight italic">{viewDetail.source || 'General Revenue'}</h3>
                 <div className="flex items-center gap-4 mt-3">
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-2">
                      <CreditCard size={10} className="text-indigo-400" />
                      ID: <span className="font-mono text-white italic">{viewDetail.transactionId || 'EXTERNAL-REF'}</span>
                    </p>
                 </div>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-10 px-2">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Customer</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-lg shadow-inner border border-indigo-100/50">
                    {viewDetail.client?.[0] || 'C'}
                  </div>
                  <div className="flex flex-col">
                    <p className="text-[16px] font-black text-slate-900 leading-none">{viewDetail.client || 'Customer'}</p>
                    <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{viewDetail.category || 'General'}</p>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Amount</p>
                <p className="text-[32px] font-black text-indigo-600 font-mono italic leading-none tracking-tighter">₹{parseFloat(viewDetail.amount || 0).toLocaleString()}</p>
                <div className="flex items-center gap-2 mt-2">
                   <TrendingUp size={12} className="text-emerald-500" />
                   <span className="text-[10px] font-black text-emerald-600 uppercase">Received</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/60 rounded-3xl p-8 space-y-6 shadow-sm">
               <div className="grid grid-cols-2 gap-8">
                 <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Payment Method</p>
                   <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                      <div className="w-8 h-8 bg-slate-50 rounded-xl flex items-center justify-center text-slate-500"><Banknote size={16}/></div>
                      <p className="text-[13px] font-black text-slate-800 uppercase tracking-wide">{viewDetail.method || 'Standard'}</p>
                   </div>
                 </div>
                 <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Bank Account</p>
                   <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                      <div className="w-8 h-8 bg-slate-50 rounded-xl flex items-center justify-center text-slate-500"><Landmark size={16}/></div>
                      <p className="text-[13px] font-black text-slate-800 truncate">{viewDetail.bank || 'Bank'}</p>
                   </div>
                 </div>
               </div>
               <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-200/60">
                 <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Payment Date</p>
                   <div className="flex items-center gap-3">
                      <CalendarIcon size={14} className="text-indigo-500" />
                      <p className="text-[14px] font-black text-slate-800 italic">{viewDetail.receivedDate || 'N/A'}</p>
                   </div>
                 </div>
                 <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Status</p>
                   <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] inline-flex items-center gap-2 shadow-sm">
                     <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                     {viewDetail.status || 'Received'}
                   </span>
                 </div>
               </div>
            </div>

            {viewDetail.description && (
              <div className="px-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Contextual Intelligence</p>
                <div className="p-6 bg-slate-50/50 border border-slate-100 rounded-2xl text-[14px] font-medium text-slate-600 leading-relaxed italic shadow-inner">
                  "{viewDetail.description}"
                </div>
              </div>
            )}

            {viewDetail.extraInstallments?.length > 0 && (
              <div className="px-2">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Installment Amortization</p>
                  <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100 uppercase">{viewDetail.extraInstallments.length} Sequential Events</span>
                </div>
                <div className="space-y-3">
                  {viewDetail.extraInstallments.map((inst, i) => (
                    <div key={i} className="flex justify-between items-center p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-indigo-200 transition-all group active:scale-[0.99]">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-[12px] font-black text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
                           {i+1 < 10 ? `0${i+1}` : i+1}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[14px] font-black text-slate-900 italic tracking-tight">{inst.date}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">{inst.bankName || 'General Account'}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="font-mono text-[16px] font-black text-slate-900 italic tracking-tighter">₹{parseFloat(inst.amount).toLocaleString()}</span>
                        <div className="flex items-center gap-1.5 mt-1">
                           <div className="w-1 h-1 rounded-full bg-indigo-400"></div>
                           <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Scheduled Flow</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </SlideOver>

      <IncomeForm
        isOpen={openForm}
        onClose={() => setOpenForm(false)}
        income={editIncome}
        onSave={handleSave}
        clients={clients}
        bankAccounts={bankAccounts}
        incomeCategories={incomeCategories}
        onAddCategory={handleAddCategory}
      />

      <SlideOver
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title="Income Details"
        footer={<div className="flex justify-end w-full px-2"><button onClick={() => setViewModalOpen(false)} className="px-6 py-2 bg-slate-900 text-white text-[13px] font-bold rounded hover:bg-black transition-colors">Close</button></div>}
      >
        {viewDetail && (
          <div className="space-y-8">
            <div className="flex items-center gap-5 p-6 bg-slate-900 rounded-2xl text-white relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-10"><Wallet size={120} /></div>
               <div className="relative z-10">
                 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-1">Details</p>
                 <h3 className="text-[24px] font-black tracking-tight">{viewDetail.source || 'General Revenue'}</h3>
                 <p className="text-[12px] text-slate-400 font-medium mt-1">Transaction ID: <span className="font-mono">{viewDetail.transactionId || 'N/A'}</span></p>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-8 px-2">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Customer</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-black">{viewDetail.client?.[0]}</div>
                  <p className="text-[15px] font-bold text-slate-800">{viewDetail.client || 'Customer'}</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Amount</p>
                <p className="text-[22px] font-black text-indigo-600 font-mono italic leading-none">₹{parseFloat(viewDetail.amount || 0).toLocaleString()}</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-5">
               <div className="grid grid-cols-2 gap-6">
                 <div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Payment Method</p>
                   <p className="text-[13px] font-bold text-slate-800 flex items-center gap-1.5"><CreditCard size={14} className="text-slate-400"/> {viewDetail.method || 'Standard'}</p>
                 </div>
                 <div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Bank Account</p>
                   <p className="text-[13px] font-bold text-slate-800 flex items-center gap-1.5"><Landmark size={14} className="text-slate-400"/> {viewDetail.bank || 'Bank'}</p>
                 </div>
               </div>
               <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-200/60">
                 <div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Payment Date</p>
                   <p className="text-[13px] font-bold text-slate-800">{viewDetail.receivedDate || '—'}</p>
                 </div>
                 <div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Status</p>
                   <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-black uppercase tracking-wider">{viewDetail.status || 'Received'}</span>
                 </div>
               </div>
            </div>

            {viewDetail.description && (
              <div className="px-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Description</p>
                <div className="p-4 bg-white border border-slate-100 rounded-xl text-[13px] text-slate-600 leading-relaxed shadow-sm italic">
                  "{viewDetail.description}"
                </div>
              </div>
            )}

            {viewDetail.extraInstallments?.length > 0 && (
              <div className="px-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Milestones</p>
                <div className="space-y-2">
                  {viewDetail.extraInstallments.map((inst, i) => (
                    <div key={i} className="flex justify-between items-center p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-indigo-200 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-50 rounded flex items-center justify-center text-[11px] font-bold text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600">#{i+1}</div>
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
