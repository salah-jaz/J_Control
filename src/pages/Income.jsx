import { useEffect, useState, useRef, useMemo, Fragment } from "react";
import { 
  Eye, Edit2, Trash2, Plus, Download, Search, X, Check, Landmark, Wallet, 
  TrendingUp, TrendingDown, AlertCircle, Receipt, Loader2, Save, Layers, User, Target, 
  Building2, Calendar as CalendarIcon, Phone, Mail, BadgeCheck, Activity, 
  Briefcase, Filter, MessageSquare, CreditCard, Banknote, CheckCircle2,
  ChevronDown, ChevronRight, FileText, Clock, AlertTriangle, Lock
} from "lucide-react";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { exportToCSV } from "../utils/csvExport";
import { validateFinancialForm } from "../utils/financialValidation";
import { invalidateCache } from "../utils/apiFetch";

import { createIncome, updateIncome, deleteIncome, recordIncomePayment, getIncome } from "../services/incomeService";
import { getBankAccounts } from "../services/bankAccountService";
import { getIncomeCategories, createIncomeCategory } from "../services/incomeCategoryService";
import { useIncomeList, useIncomeSummary, useExpenseSummary, useClients } from "../hooks/useApiQueries";
import { queryKeys } from "../query/queryKeys";
import clsx from "clsx";
import PageHeader from "../components/ui/PageHeader";
import EmptyState from "../components/ui/EmptyState";
import { FilterSelect, ClearFiltersButton } from "../components/ui/FilterControls";
import { TablePagination } from "../components/ui/DataTableSection";
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
  paymentType: "single", // 'single' | 'split'
  method: "Bank Account", // 'Bank Account' | 'Cash'
  bank: "",
  bankAccountId: null,
  singlePaymentRecorded: true,
  singlePaymentAmount: "",
  transactionId: "",
  receivedDate: new Date().toISOString().split("T")[0],
  status: "Fully Paid",
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
  paymentTerms: "Single Payment",
  collectionStatus: "Collected",
  followUpDate: "",
  commission: "",
  taxCategory: "",
  autoCalculateAmount: true,
  discount: "",
  taxAmount: "",
  extraInstallments: [],
};

export const formatCustomerDisplay = (c) => {
  if (!c) return "";
  const custName = (c.client_name || c.name || "").trim();
  const compName = (c.company_name || "").trim();
  if (custName && compName && custName.toLowerCase() !== compName.toLowerCase()) {
    return `${custName} (${compName})`;
  }
  return custName || compName || "Unknown Customer";
};

export const getClientDisplayName = (clientValue, clients = []) => {
  if (!clientValue) return "—";
  if (clientValue === 'Cash Account' || clientValue === 'Opening Balance') {
    return clientValue;
  }
  if (/\(.*\)/.test(clientValue)) {
    return clientValue;
  }
  if (Array.isArray(clients) && clients.length > 0) {
    const valLower = clientValue.trim().toLowerCase();
    const match = clients.find(c => 
      (c.company_name && c.company_name.trim().toLowerCase() === valLower) ||
      (c.client_name && c.client_name.trim().toLowerCase() === valLower) ||
      (c.name && c.name.trim().toLowerCase() === valLower)
    );
    if (match) {
      return formatCustomerDisplay(match);
    }
  }
  return clientValue;
};

const IncomeForm = ({ isOpen, onClose, income, onSave, clients = [], bankAccounts = [], incomeCategories = [], onAddCategory }) => {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [tab, setTab] = useState("basic");
  const [isSaving, setIsSaving] = useState(false);

  // Check if existing income has payment activity
  const hasPaymentActivity = useMemo(() => {
    if (!income) return false;
    const paid = Number(income.paidAmount ?? income.initialDepositAmount ?? 0);
    if (paid > 0) return true;
    if (Array.isArray(income.extraInstallments)) {
      return income.extraInstallments.some(inst => 
        inst.status === 'Paid' || inst.status === 'Received' || Boolean(inst.paidDate)
      );
    }
    return false;
  }, [income]);

  useEffect(() => {
    if (income) {
      const extra = Array.isArray(income.extraInstallments) ? income.extraInstallments : [];
      const isSplit = income.paymentType === 'split' || extra.length > 0 || income.paymentTerms === 'Split Payment';

      let matchedClient = income.client || "";
      if (matchedClient && clients.length > 0) {
        const found = clients.find(c => {
          const formatted = formatCustomerDisplay(c);
          return (
            formatted.toLowerCase() === matchedClient.toLowerCase() ||
            (c.client_name && c.client_name.toLowerCase() === matchedClient.toLowerCase()) ||
            (c.company_name && c.company_name.toLowerCase() === matchedClient.toLowerCase()) ||
            (c.name && c.name.toLowerCase() === matchedClient.toLowerCase())
          );
        });
        if (found) {
          matchedClient = formatCustomerDisplay(found);
        }
      }

      setForm({
        ...emptyForm,
        ...income,
        client: matchedClient,
        paymentType: isSplit ? 'split' : 'single',
        method: "Bank Account",
        bankAccountId: income.bankAccountId || income.initialDepositBankId || null,
        discount: income.discountAmount != null && income.discountAmount !== "" ? String(income.discountAmount) : "",
        taxAmount: income.gstAmount != null && income.gstAmount !== "" ? String(income.gstAmount) : "",
        singlePaymentRecorded: true,
        singlePaymentAmount: "",
        extraInstallments: extra.map((i, idx) => ({
          ...i,
          id: i.id || `inst_${income.id || 'new'}_${idx}`,
          date: i.date || new Date().toISOString().split("T")[0],
          amount: i.amount != null ? String(i.amount) : "",
          method: "Bank Account",
          status: 'Paid',
          bankAccountId: i.bankAccountId || null,
          bankName: i.bankName || getBankDisplayName(i.bankAccountId),
          paidDate: i.paidDate || i.date || new Date().toISOString().split("T")[0],
        })),
      });
    } else {
      setForm({
        ...emptyForm,
        method: "Bank Account",
        bankAccountId: null,
        bank: "",
        singlePaymentRecorded: true,
        singlePaymentAmount: "",
        receivedDate: new Date().toISOString().split("T")[0],
        extraInstallments: [],
      });
    }
    setTab("basic");
    setErrors({});
  }, [income, isOpen]);

  const getBankDisplayName = (bankId) => {
    const b = bankAccounts.find((x) => x.id === parseInt(bankId));
    return b ? `${b.bankName} - ${b.accountNumber}` : "";
  };

  const subtotal = parseFloat(form.amount) || 0;
  const discountVal = parseFloat(form.discount) || 0;
  const taxVal = parseFloat(form.taxAmount) || 0;
  const totalAmount = Math.max(0, subtotal - discountVal + taxVal);

  // Dynamic Payment Status Calculation
  useEffect(() => {
    let paid = 0;
    if (form.paymentType === 'single') {
      paid = totalAmount; // For single payment, paid amount is automatically equal to totalAmount
    } else {
      paid = (form.extraInstallments || []).reduce((acc, curr) => {
        return acc + (parseFloat(curr.amount) || 0);
      }, 0);
    }

    const calculatedStatus = paid <= 0 
      ? 'Pending' 
      : (paid >= totalAmount - 0.01 ? 'Fully Paid' : 'Partially Paid');

    setForm(prev => {
      if (prev.status !== calculatedStatus) {
        return { ...prev, status: calculatedStatus };
      }
      return prev;
    });
  }, [form.paymentType, form.extraInstallments, totalAmount]);

  const validate = () => {
    const e = {};
    if (!form.client) e.client = "Customer is required";
    if (!form.source) e.source = "Income Title / Source is required";
    if (!form.amount || parseFloat(form.amount) <= 0) e.amount = "Base amount must be greater than 0";

    const valResult = validateFinancialForm({
      totalAmount,
      paymentType: form.paymentType,
      method: form.method,
      singlePaymentRecorded: true,
      singlePaymentAmount: totalAmount,
      singlePaymentBankId: form.bankAccountId,
      extraInstallments: form.extraInstallments,
    });

    if (!valResult.isValid) {
      toast.error(valResult.message);
      if (valResult.field) e[valResult.field] = valResult.message;
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSaving(true);
    try {
      const payload = {
        ...form,
        singlePaymentRecorded: true,
        singlePaymentAmount: String(totalAmount),
      };
      await onSave(payload);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const TABS = [
    { id: 'basic', label: 'Basic Info', icon: Target },
    { id: 'financial', label: 'Financial Info', icon: Wallet },
    ...(form.paymentType === 'split' ? [{ id: 'installments', label: 'Payment Milestones', icon: Layers }] : []),
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
            <div className="hidden sm:flex flex-col border-l border-slate-200 pl-6">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Dynamic Status</span>
              <span className={clsx(
                "text-[12px] font-black uppercase tracking-wider mt-1 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5 w-fit",
                form.status === 'Fully Paid' ? "bg-emerald-100 text-emerald-800" :
                form.status === 'Partially Paid' ? "bg-amber-100 text-amber-800" :
                "bg-slate-200 text-slate-700"
              )}>
                <span className={clsx("w-1.5 h-1.5 rounded-full",
                  form.status === 'Fully Paid' ? "bg-emerald-600" :
                  form.status === 'Partially Paid' ? "bg-amber-600" : "bg-slate-500"
                )} />
                {form.status}
              </span>
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
                      <select className={clsx(inputCls, "pl-11 appearance-none", errors.client && "border-rose-400")} value={form.client} onChange={e => setForm({ ...form, client: e.target.value })}>
                        <option value="">Select customer...</option>
                        {clients.map(c => {
                          const display = formatCustomerDisplay(c);
                          return (
                            <option key={c.id} value={display}>
                              {display}
                            </option>
                          );
                        })}
                        {form.client && !clients.some(c => formatCustomerDisplay(c) === form.client) && (
                          <option value={form.client}>{form.client}</option>
                        )}
                      </select>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <Label required>Income Title / Source</Label>
                    <input className={clsx(inputCls, errors.source && "border-rose-400")} placeholder="e.g. Consulting Services" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <div className="flex gap-2">
                      <select className={clsx(inputCls, "flex-1 appearance-none")} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                        <option value="">Uncategorized</option>
                        {incomeCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                      <button type="button" onClick={() => {
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
                {/* Financial Summary Card */}
                <div className="bg-slate-900 rounded-3xl p-8 text-white space-y-6 relative overflow-hidden group shadow-2xl border border-slate-800">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/10 blur-[100px] rounded-full -mr-32 -mt-32 group-hover:bg-emerald-600/20 transition-colors" />
                  <div className="flex justify-between items-center relative z-10">
                    <h4 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.2em]">Financial Summary</h4>
                    <TrendingUp className="text-emerald-500" size={24} />
                  </div>
                  <div className="space-y-4 relative z-10">
                    <div className="flex justify-between items-end border-b border-slate-800 pb-4">
                      <span className="text-[11px] font-bold text-slate-400 uppercase">Amount</span>
                      <span className="text-[18px] font-black font-mono tracking-tight italic">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-end border-b border-slate-800 pb-4">
                      <span className="text-[11px] font-bold text-rose-400 uppercase tracking-widest">Discount</span>
                      <span className="text-[18px] font-black font-mono tracking-tight italic text-rose-400">- ₹{discountVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-end border-b border-slate-800 pb-4">
                      <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest">Tax Amount</span>
                      <span className="text-[18px] font-black font-mono tracking-tight italic text-emerald-400">+ ₹{taxVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-end pt-4">
                      <span className="text-[13px] font-black text-white uppercase tracking-[0.3em]">Total Value</span>
                      <span className="text-[32px] font-black font-mono tracking-tighter italic text-indigo-400 leading-none">₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                {/* Amount Inputs */}
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <Label required>Amount (₹)</Label>
                    <input type="number" className={clsx(inputCls, "font-black italic text-slate-900 text-lg", errors.amount && "border-rose-400")} placeholder="0.00" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Discount (₹)</Label>
                      <input type="number" className={inputCls} placeholder="0.00" value={form.discount} onChange={e => setForm({ ...form, discount: e.target.value })} />
                    </div>
                    <div>
                      <Label>Tax Amount (₹)</Label>
                      <input type="number" className={inputCls} placeholder="0.00" value={form.taxAmount} onChange={e => setForm({ ...form, taxAmount: e.target.value })} />
                    </div>
                  </div>
                </div>

                {/* Payment Type Selection */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <Label required>Payment Structure</Label>
                    {hasPaymentActivity && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200/80 flex items-center gap-1.5">
                        <Lock size={12} className="text-amber-600" />
                        <span>Locked (Payment Activity Exists)</span>
                      </span>
                    )}
                  </div>
                  {hasPaymentActivity ? (
                    <div className="p-4 bg-slate-100/70 border border-slate-200 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white text-indigo-600 shadow-sm border border-slate-200/60 flex items-center justify-center font-bold">
                          {form.paymentType === 'split' ? <Layers size={18} /> : <CreditCard size={18} />}
                        </div>
                        <div>
                          <span className="text-[13px] font-black uppercase tracking-wider text-slate-800 block">
                            {form.paymentType === 'split' ? 'Split Payment (Milestones)' : 'Single Payment'}
                          </span>
                          <span className="text-[11px] font-medium text-slate-500">
                            Structure is locked because payment records already exist for this income.
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, paymentType: 'single' })}
                        className={clsx(
                          "py-3 px-4 rounded-xl text-[12px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2",
                          form.paymentType === 'single'
                            ? "bg-white text-indigo-700 shadow-md ring-1 ring-indigo-200"
                            : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                        )}
                      >
                        <CreditCard size={16} />
                        <span>Single Payment</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setForm({
                            ...form,
                            paymentType: 'split',
                            extraInstallments: form.extraInstallments.length > 0 ? form.extraInstallments : [
                              { id: `inst_new_0`, date: form.receivedDate || new Date().toISOString().split("T")[0], amount: String(totalAmount), method: 'Bank Account', bankAccountId: null, bankName: '', status: 'Paid', note: 'Initial Milestone' }
                            ]
                          });
                        }}
                        className={clsx(
                          "py-3 px-4 rounded-xl text-[12px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2",
                          form.paymentType === 'split'
                            ? "bg-white text-indigo-700 shadow-md ring-1 ring-indigo-200"
                            : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                        )}
                      >
                        <Layers size={16} />
                        <span>Split Payment (Milestones)</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Single Payment Configuration */}
                {form.paymentType === 'single' && (
                  <div className="p-6 bg-slate-50/70 border border-slate-200 rounded-3xl space-y-6 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-4">
                      <div>
                        <h5 className="text-[13px] font-black text-slate-800 uppercase tracking-wider">Single Payment Setup</h5>
                        <p className="text-[11px] text-slate-500 font-medium">Select destination account and payment details</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status Preview:</span>
                        <span className={clsx(
                          "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                          form.status === 'Fully Paid' ? "bg-emerald-100 text-emerald-800" :
                          form.status === 'Partially Paid' ? "bg-amber-100 text-amber-800" :
                          "bg-slate-200 text-slate-700"
                        )}>
                          {form.status}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <Label required>Bank Account</Label>
                        <select
                          className={clsx(inputCls, "bg-white appearance-none", errors.bankAccountId && "border-rose-400")}
                          value={form.bankAccountId || ""}
                          onChange={e => {
                            const b = bankAccounts.find(x => x.id === parseInt(e.target.value));
                            setForm({
                              ...form,
                              method: 'Bank Account',
                              bankAccountId: e.target.value ? parseInt(e.target.value) : null,
                              bank: b ? b.bankName : ""
                            });
                          }}
                        >
                          <option value="">Select bank account...</option>
                          {bankAccounts.map(b => (
                            <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <Label>Payment Date</Label>
                        <input type="date" className={clsx(inputCls, "bg-white")} value={form.receivedDate} onChange={e => setForm({ ...form, receivedDate: e.target.value })} />
                      </div>

                      <div>
                        <Label>Transaction ID / Reference</Label>
                        <input className={clsx(inputCls, "bg-white")} placeholder="e.g. TXN-94852" value={form.transactionId} onChange={e => setForm({ ...form, transactionId: e.target.value })} />
                      </div>

                      <div className="col-span-2">
                        <Label>Amount Received (₹)</Label>
                        <div className="relative">
                          <input
                            type="text"
                            readOnly
                            tabIndex={-1}
                            className={clsx(inputCls, "bg-slate-100/90 text-slate-800 font-black italic font-mono cursor-not-allowed select-none")}
                            value={`₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                          />
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium mt-1.5">
                          Amount received is automatically equal to the Total Value for single payment.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Split Payment Prompt */}
                {form.paymentType === 'split' && (
                  <div className="p-6 bg-indigo-50/50 border border-indigo-100 rounded-3xl flex items-center justify-between">
                    <div>
                      <h5 className="text-[13px] font-black text-indigo-900 uppercase tracking-wider flex items-center gap-2">
                        <Layers size={16} className="text-indigo-600" />
                        <span>Split Payment Configured</span>
                      </h5>
                      <p className="text-[11px] text-indigo-700 font-medium mt-1">
                        Configure payment milestones, dates, amounts, and bank accounts in the Payment Milestones tab.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTab('installments')}
                      className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-[12px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md flex items-center gap-2"
                    >
                      <span>Configure Milestones</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {tab === 'installments' && form.paymentType === 'split' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                  <div>
                    <h4 className="text-[14px] font-black text-slate-900 uppercase tracking-widest">Payment Milestones</h4>
                    <p className="text-[11px] font-bold text-slate-400 uppercase mt-1">Configure separate payments and milestone tracking</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const allocated = (form.extraInstallments || []).reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
                      const rem = Math.max(0, totalAmount - allocated);
                      setForm({
                        ...form,
                        extraInstallments: [
                          ...form.extraInstallments,
                          {
                            id: `inst_new_${form.extraInstallments.length}`,
                            date: new Date().toISOString().split("T")[0],
                            amount: rem > 0 ? String(rem) : '',
                            method: 'Bank Account',
                            bankAccountId: null,
                            bankName: '',
                            status: 'Paid',
                            paidDate: new Date().toISOString().split("T")[0],
                            note: `Milestone #${form.extraInstallments.length + 1}`
                          }
                        ]
                      });
                    }}
                    className="px-6 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl text-[12px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm flex items-center gap-2 border border-indigo-100 group"
                  >
                    <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                    <span>Add Milestone</span>
                  </button>
                </div>

                {/* Milestones Allocation Progress Banner */}
                {(() => {
                  const allocated = (form.extraInstallments || []).reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
                  const paid = allocated;
                  const unallocated = totalAmount - allocated;

                  return (
                    <div className="p-6 bg-slate-900 rounded-2xl text-white grid grid-cols-4 gap-4 shadow-lg">
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Payable</span>
                        <span className="text-[20px] font-black font-mono italic text-white">₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider block">Allocated in Milestones</span>
                        <span className={clsx("text-[20px] font-black font-mono italic", allocated > totalAmount ? "text-rose-400" : "text-indigo-300")}>
                          ₹{allocated.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider block">Recorded as Paid</span>
                        <span className="text-[20px] font-black font-mono italic text-emerald-400">₹{paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider block">Unallocated</span>
                        <span className="text-[20px] font-black font-mono italic text-amber-300">₹{Math.max(0, unallocated).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  );
                })()}

                <div className="space-y-6">
                  {form.extraInstallments.length === 0 ? (
                    <div className="py-20 border-2 border-dashed border-slate-100 rounded-3xl text-center bg-slate-50/50">
                      <Layers size={48} className="mx-auto text-slate-200 mb-4" />
                      <p className="text-[14px] font-black text-slate-400 uppercase tracking-widest">No Milestones Configured</p>
                      <p className="text-[11px] text-slate-300 mt-1 uppercase">Click Add Milestone to split payments</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-6">
                      {form.extraInstallments.map((row, idx) => (
                        <div key={idx} className="bg-slate-50/60 border border-slate-200 rounded-2xl p-6 relative group hover:border-indigo-200 transition-colors shadow-sm space-y-4">
                          <div className="flex items-center justify-between pb-3 border-b border-slate-200/50">
                            <div className="flex items-center gap-3">
                              <span className="w-7 h-7 bg-indigo-600 text-white rounded-lg flex items-center justify-center text-[12px] font-black">
                                {idx + 1}
                              </span>
                              <span className="text-[12px] font-black text-slate-800 uppercase tracking-wide">
                                Milestone #{idx + 1}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              {parseFloat(row.amount) > 0 ? (
                                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 inline-flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  Payment Recorded
                                </span>
                              ) : (
                                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200 inline-flex items-center gap-1.5">
                                  Enter Amount
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => setForm({ ...form, extraInstallments: form.extraInstallments.filter((_, i) => i !== idx) })}
                                className="h-8 w-8 text-rose-500 hover:bg-rose-50 rounded-lg flex items-center justify-center transition-colors"
                                title="Remove Milestone"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-3">
                              <Label>Payment Date</Label>
                              <input type="date" className={clsx(inputCls, "bg-white")} value={row.date} onChange={e => {
                                const n = [...form.extraInstallments];
                                n[idx].date = e.target.value;
                                n[idx].paidDate = e.target.value;
                                setForm({ ...form, extraInstallments: n });
                              }} />
                            </div>
                            <div className="col-span-3">
                              <Label>Amount (₹)</Label>
                              <input type="number" className={clsx(inputCls, "bg-white font-black italic")} value={row.amount} onChange={e => {
                                const n = [...form.extraInstallments];
                                n[idx].amount = e.target.value;
                                if (parseFloat(e.target.value) > 0) {
                                  n[idx].status = 'Paid';
                                  if (!n[idx].paidDate) {
                                    n[idx].paidDate = n[idx].date || new Date().toISOString().split("T")[0];
                                  }
                                }
                                setForm({ ...form, extraInstallments: n });
                              }} />
                            </div>
                            <div className="col-span-6">
                              <Label required>Bank Account</Label>
                              <select
                                className={clsx(inputCls, "bg-white appearance-none")}
                                value={row.bankAccountId || ""}
                                onChange={e => {
                                  const b = bankAccounts.find(x => x.id === parseInt(e.target.value));
                                  const n = [...form.extraInstallments];
                                  n[idx].bankAccountId = e.target.value ? parseInt(e.target.value) : null;
                                  n[idx].bankName = b ? `${b.bankName} - ${b.accountNumber}` : '';
                                  n[idx].method = 'Bank Account';
                                  setForm({ ...form, extraInstallments: n });
                                }}
                              >
                                <option value="">Select bank account...</option>
                                {bankAccounts.map(b => (
                                  <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber}</option>
                                ))}
                              </select>
                            </div>
                          </div>
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

// Modal for recording a payment against a pending income or split milestone
const RecordPaymentModal = ({ isOpen, onClose, income, milestoneIndex = null, bankAccounts = [], onSuccess }) => {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Bank Account");
  const [bankAccountId, setBankAccountId] = useState(null);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [transactionId, setTransactionId] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (income && isOpen) {
      if (milestoneIndex !== null && income.extraInstallments?.[milestoneIndex]) {
        const m = income.extraInstallments[milestoneIndex];
        setAmount(String(m.amount || ""));
        setMethod("Bank Account");
        setBankAccountId(null);
        setNote(m.note || `Payment for milestone #${milestoneIndex + 1}`);
      } else {
        const remaining = Number(income.outstandingAmount ?? (Number(income.netAmount || income.amount) - Number(income.paidAmount || 0)));
        setAmount(String(Math.max(0, remaining)));
        setMethod("Bank Account");
        setBankAccountId(null);
        setNote(`Payment for ${income.source}`);
      }
      setPaymentDate(new Date().toISOString().split("T")[0]);
      setTransactionId(`TXN-${Date.now().toString().slice(-6)}`);
    }
  }, [income, milestoneIndex, isOpen]);

  if (!isOpen || !income) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast.error("Please enter a valid positive payment amount");
      return;
    }
    if (!bankAccountId) {
      toast.error("Please select a bank account to receive this payment");
      return;
    }

    setLoading(true);
    try {
      await recordIncomePayment(income.id, {
        amount: amt,
        method: "Bank Account",
        bank_account_id: bankAccountId,
        payment_date: paymentDate,
        installment_index: milestoneIndex,
        transaction_id: transactionId,
        note,
      });
      toast.success("Payment recorded successfully!");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-slate-100 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Treasury Action</span>
            <h3 className="text-[18px] font-black text-slate-900">
              {milestoneIndex !== null ? `Record Milestone #${milestoneIndex + 1} Payment` : `Record Payment (#INC-${income.id})`}
            </h3>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Payment Amount (₹) *</label>
            <input
              type="number"
              step="0.01"
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[16px] font-black italic font-mono text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Payment Date *</label>
              <input
                type="date"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-bold text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
                value={paymentDate}
                onChange={e => setPaymentDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Transaction ID / Reference</label>
              <input
                type="text"
                placeholder="e.g. UPI-983421 or Bank Ref"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-bold text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
                value={transactionId}
                onChange={e => setTransactionId(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Credit Bank Account *</label>
            <select
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-bold text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm appearance-none"
              value={bankAccountId || ""}
              onChange={e => setBankAccountId(e.target.value ? parseInt(e.target.value) : null)}
            >
              <option value="">Select bank account...</option>
              {bankAccounts.map(b => (
                <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber} (Bal: ₹{Number(b.currentBalance ?? b.current_balance ?? 0).toLocaleString()})</option>
              ))}
            </select>
          </div>


          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 text-[13px] font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-2.5 bg-indigo-600 text-white text-[13px] font-black rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              <span>{loading ? "Recording..." : "Confirm Payment"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, colorClass, className }) => (
  <div className={clsx("bg-white p-4 rounded-md border border-slate-200 shadow-sm flex items-center gap-4", className)}>
    <div className={clsx("w-10 h-10 rounded flex items-center justify-center shrink-0", colorClass)}>
      <Icon size={20} className="text-white" />
    </div>
    <div className="min-w-0">
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">{title}</p>
      <p className="text-[20px] font-bold text-slate-900 truncate">{value}</p>
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
  
  // Row expansion state (Set supports expanding/collapsing multiple rows)
  const [expandedRowIds, setExpandedRowIds] = useState(() => new Set());

  // Record payment modal state
  const [recordPaymentData, setRecordPaymentData] = useState(null);

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

  const expenseFilters = useMemo(() => {
    const params = {};
    if (filters.bank_account_id) params.bank_account_id = filters.bank_account_id;
    if (filters.date_from) params.date_from = filters.date_from;
    if (filters.date_to) params.date_to = filters.date_to;
    return params;
  }, [filters.bank_account_id, filters.date_from, filters.date_to]);

  const { data: expenseSummary } = useExpenseSummary(expenseFilters);
  const { data: clientsResult } = useClients({ per_page: 100 });

  const receivedCredit = Number(incomeSummary?.totalReceived || 0);
  const debitAmount = Number(
    expenseSummary?.totalExpenses ?? expenseSummary?.totalExpense ?? incomeSummary?.totalDebit ?? 0
  );
  const totalValue = receivedCredit - debitAmount;
  const totalOutstanding = Number(incomeSummary?.totalBalance || 0);

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
    queryClient.invalidateQueries({ queryKey: queryKeys.income.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
  }, [queryClient]);

  const invalidateTreasury = async () => {
    invalidateCache('/bank-accounts');
    invalidateCache('/incomes');
    invalidateCache('/expenses');
    invalidateCache('/transactions');
    queryClient.invalidateQueries({ queryKey: queryKeys.bankAccounts() });
    queryClient.invalidateQueries({ queryKey: queryKeys.income.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    
    const updatedAccounts = await getBankAccounts();
    setBankAccounts(updatedAccounts);
  };

  const handleSave = async (formData) => {
    try {
      if (editIncome) {
        await updateIncome(editIncome.id, formData);
        toast.success("Income updated");
      } else {
        await createIncome(formData);
        toast.success("Income recorded");
      }
      await invalidateTreasury();
      setOpenForm(false);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to save income");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this income record? Associated bank transactions will be reconciled.")) return;
    try {
      await deleteIncome(id);
      toast.success("Income deleted");
      await invalidateTreasury();
    } catch (e) {
      toast.error(e.response?.data?.message || "Deletion failed");
    }
  };

  const openViewModal = async (income) => {
    if (!income?.id) return;
    setViewDetail(income);
    setViewModalOpen(true);
    try {
      const detailed = await getIncome(income.id);
      if (detailed) {
        setViewDetail((prev) => (prev?.id === detailed.id ? { ...prev, ...detailed } : prev));
      }
    } catch (e) {
      // Keep existing record if single fetch fails
    }
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

  const toggleRow = (id) => {
    setExpandedRowIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getIncomeDescription = (item) => {
    if (!item) return "—";
    const isOB = item.source === 'Opening Balance' ||
      item.category === 'Opening Balance' ||
      (item.referenceNumber && String(item.referenceNumber).startsWith('BANK-OB-')) ||
      (item.invoiceNo && String(item.invoiceNo).startsWith('OB-'));
    if (isOB) {
      return "Opening Balance";
    }
    const clientDisplay = getClientDisplayName(item.client, clients);
    if (item.source_description) {
      if (item.client && clientDisplay && clientDisplay !== item.client && item.source_description.includes(item.client)) {
        return item.source_description.replace(item.client, clientDisplay);
      }
      return item.source_description;
    }
    if (item.source === 'INV' || item.category === 'INV') {
      const party = clientDisplay ? ` for ${clientDisplay}` : '';
      const ref = item.invoice_no || item.referenceNumber || item.inv_id;
      const refPart = ref ? ` (Jazno: ${ref})` : '';
      return `INV payment${party}${refPart}`;
    }
    const src = item.source || 'Income';
    const party = clientDisplay ? ` for ${clientDisplay}` : '';
    const ref = item.invoice_no || item.referenceNumber || item.transactionId;
    const refPart = ref ? ` (Ref: ${ref})` : '';
    return `${src} payment${party}${refPart}`;
  };

  const getBankNameDisplay = (item) => {
    if (!item) return "—";

    const isCash = String(item.method).toLowerCase() === 'cash' ||
      item.bankAccount?.bank_name?.toLowerCase() === 'cash' ||
      item.bankAccount?.account_type?.toLowerCase() === 'cash' ||
      item.bankAccount?.account_name?.toLowerCase()?.includes('cash') ||
      String(item.bank).toLowerCase() === 'cash';

    const firstTx = Array.isArray(item.transactions) && item.transactions.length > 0 ? item.transactions[0] : null;

    const targetId = item.bankAccountId || 
      item.bank_account_id || 
      item.bankAccount?.id || 
      item.initialDepositBankId || 
      item.initial_deposit_bank_id ||
      firstTx?.bank_account_id ||
      firstTx?.bankAccountId ||
      firstTx?.bankAccount?.id;

    if (targetId) {
      const b = bankAccounts.find(acc => String(acc.id) === String(targetId));
      if (b) {
        const isAccCash = b.accountType?.toLowerCase() === 'cash' ||
          b.bankName?.toLowerCase() === 'cash' ||
          b.accountNumber?.toLowerCase() === 'cash' ||
          b.accountName?.toLowerCase()?.includes('cash');
        if (isAccCash) return b.accountName || "Cash Account";
        return b.bankName || b.accountName || b.nickName || "Bank Account";
      }
    }

    if (item.bankAccount) {
      const isRelCash = item.bankAccount.bank_name?.toLowerCase() === 'cash' ||
        item.bankAccount.account_type?.toLowerCase() === 'cash' ||
        item.bankAccount.account_name?.toLowerCase()?.includes('cash');
      if (isRelCash) {
        return item.bankAccount.account_name || "Cash Account";
      }
      return item.bankAccount.bank_name || item.bankAccount.bankName || item.bankAccount.account_name || item.bankAccount.nick_name || "Bank Account";
    }

    if (firstTx?.bankAccount) {
      const isRelCash = firstTx.bankAccount.bank_name?.toLowerCase() === 'cash' ||
        firstTx.bankAccount.account_type?.toLowerCase() === 'cash' ||
        firstTx.bankAccount.account_name?.toLowerCase()?.includes('cash');
      if (isRelCash) {
        return firstTx.bankAccount.account_name || "Cash Account";
      }
      return firstTx.bankAccount.bank_name || firstTx.bankAccount.bankName || firstTx.bankAccount.account_name || "Bank Account";
    }

    if (item.bank) {
      if (String(item.bank).toLowerCase() === 'cash') return "Cash Account";
      return item.bank;
    }

    if (firstTx?.bank || firstTx?.bankName) {
      const bName = firstTx.bank || firstTx.bankName;
      if (String(bName).toLowerCase() === 'cash') return "Cash Account";
      return bName;
    }

    if (Array.isArray(item.extraInstallments) && item.extraInstallments.length > 0) {
      const inst = item.extraInstallments.find(i => i.bankName || i.bankAccountId || i.bank_account_id);
      if (inst) {
        const instBankId = inst.bankAccountId || inst.bank_account_id;
        if (instBankId) {
          const acc = bankAccounts.find(b => String(b.id) === String(instBankId));
          if (acc) {
            const isInstCash = acc.accountType?.toLowerCase() === 'cash' || acc.bankName?.toLowerCase() === 'cash';
            return isInstCash ? (acc.accountName || "Cash Account") : (acc.bankName || acc.accountName);
          }
        }
        if (inst.bankName) {
          return String(inst.bankName).toLowerCase() === 'cash' ? "Cash Account" : inst.bankName;
        }
      }
    }

    if (isCash) return "Cash Account";
    return item.method || "Bank Account";
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 animate-in fade-in duration-500 overflow-hidden">
      <div className="px-6 lg:px-8 pt-8 pb-6 bg-white border-b border-slate-200/60 shadow-sm relative z-10">
        <PageHeader
          title="Incomes"
          subtitle="Track and manage your incomes and payment receipts."
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

        {/* 5 Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8">
          <StatCard
            title="Total Value"
            value={totalValue < 0 ? `-₹${Math.abs(Number(totalValue)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : `₹${Number(totalValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            icon={Wallet}
            colorClass="bg-slate-800"
          />
          <StatCard
            title="Received (Credit)"
            value={`₹${Number(receivedCredit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            icon={TrendingUp}
            colorClass="bg-emerald-600"
          />
          <StatCard
            title="Debit"
            value={`₹${Number(debitAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            icon={TrendingDown}
            colorClass="bg-rose-600"
          />
          <StatCard
            title="Outstanding"
            value={`₹${Number(totalOutstanding || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            icon={AlertCircle}
            colorClass="bg-amber-600"
          />
          <StatCard
            title="Total Incomes"
            value={incomeSummary?.totalCount ?? incomeMeta?.total ?? 0}
            icon={Receipt}
            colorClass="bg-indigo-600"
            className="col-span-2 md:col-span-1"
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 bg-white">
        <div className="bg-slate-50/50 px-6 lg:px-8 py-3 border-b border-slate-100 flex flex-wrap items-center gap-3 sticky top-0 z-20">
          <div className="flex-1 min-w-[240px]">
            <div className="relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
              <input
                type="text"
                placeholder="Search incomes by customer, title, ref..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <FilterSelect icon={CheckCircle2} value={statusFilter} onChange={setStatusFilter}>
              <option value="All">All Status</option>
              <option value="Fully Paid">Fully Paid</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Pending">Pending</option>
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
          <div className="w-full">
            <table className="w-full text-left border-collapse table-fixed">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 sticky top-0 z-10">
                  <th className="pl-6 lg:pl-8 pr-3 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-[17%] align-middle">Ref</th>
                  <th className="px-3 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-[18%] align-middle">Customer</th>
                  <th className="px-3 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right w-[13%] align-middle">Total Value</th>
                  <th className="px-3 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-[12%] align-middle">Status</th>
                  <th className="px-3 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-[13%] align-middle">Bank</th>
                  <th className="px-3 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-[12%] align-middle">Payment Date</th>
                  <th className="pl-2 pr-6 lg:pr-8 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right w-[15%] align-middle">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {incomeLoading ? (
                  <tr><td colSpan="7" className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse italic">Synchronizing Treasury Journal...</td></tr>
                ) : incomeRecords.map(item => {
                  const netTotal = Number(item.netAmount || item.amount || 0);
                  const paid = Number(item.paidAmount ?? (item.status === 'Fully Paid' || item.status === 'Received' ? netTotal : 0));
                  const outstanding = Number(item.outstandingAmount ?? Math.max(0, netTotal - paid));
                  const isExpanded = expandedRowIds.has(item.id);
                  const bankDisplay = getBankNameDisplay(item);
                  const isCashDisplay = bankDisplay.toLowerCase().includes('cash');
                  const isPartiallyPaid = item.status === 'Partially Paid' || item.status === 'Partially Received' || (paid > 0 && outstanding > 0);

                  const bankAccountDisplayName = item.bankAccount
                    ? `${item.bankAccount.bank_name} - ${item.bankAccount.account_number}`
                    : (item.bank || bankDisplay);

                  return (
                    <Fragment key={item.id}>
                      <tr 
                        onClick={() => toggleRow(item.id)}
                        className={clsx(
                          "group cursor-pointer transition-all duration-200",
                          isExpanded ? "bg-indigo-50/40" : "hover:bg-slate-50/80"
                        )}
                      >
                        <td className="pl-6 lg:pl-8 pr-3 py-3.5 align-middle">
                          <div className="flex items-center gap-2 min-w-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRow(item.id);
                              }}
                              className="text-slate-400 hover:text-indigo-600 transition-colors p-1 shrink-0 rounded-lg hover:bg-indigo-50/80"
                              title={isExpanded ? "Collapse details" : "Expand details"}
                              aria-label={isExpanded ? "Collapse details" : "Expand details"}
                            >
                              {isExpanded ? <ChevronDown size={14} className="text-indigo-600" /> : <ChevronRight size={14} />}
                            </button>
                            <div className="flex flex-col min-w-0">
                              <span className="font-mono text-[11px] font-black text-indigo-600 italic tracking-tight">#INC-{item.id}</span>
                              <span className="text-[13px] font-black text-slate-900 mt-0.5 truncate" title={item.source || 'General Revenue'}>{item.source || 'General Revenue'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3.5 align-middle">
                          {(() => {
                            const clientDisplay = getClientDisplayName(item.client, clients);
                            return (
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center text-[11px] font-black text-slate-600 shadow-inner shrink-0">
                                  {clientDisplay?.[0] || item.client?.[0] || 'C'}
                                </div>
                                <span className="text-[13px] font-black text-slate-900 truncate" title={clientDisplay || '—'}>{clientDisplay || '—'}</span>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-3 py-3.5 text-right align-middle">
                          <span className="font-mono text-[14px] font-black text-slate-900 italic tracking-tight block">
                            ₹{netTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-3 py-3.5 align-middle">
                          <span className={clsx(
                            "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 shadow-sm whitespace-nowrap",
                            item.status === 'Fully Paid' || item.status === 'Received'
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80" :
                            item.status === 'Partially Paid' || item.status === 'Partially Received'
                              ? "bg-amber-50 text-amber-700 border border-amber-200/80" :
                              "bg-slate-100 text-slate-600 border border-slate-200/80"
                          )}>
                            <span className={clsx("w-1.5 h-1.5 rounded-full shrink-0",
                              item.status === 'Fully Paid' || item.status === 'Received' ? "bg-emerald-500" :
                              item.status === 'Partially Paid' || item.status === 'Partially Received' ? "bg-amber-500" : "bg-slate-400"
                            )} />
                            <span>{item.status}</span>
                          </span>
                        </td>
                        <td className="px-3 py-3.5 align-middle">
                          <div className="flex items-center gap-2 text-slate-700 min-w-0">
                            {isCashDisplay ? <Banknote size={14} className="text-emerald-600 shrink-0" /> : <Landmark size={14} className="text-indigo-600 shrink-0" />}
                            <span className="text-[12px] font-bold text-slate-800 tracking-tight truncate" title={bankDisplay}>
                              {bankDisplay}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3.5 align-middle">
                          <div className="flex flex-col leading-none min-w-0">
                            <div className="flex items-center gap-1.5 text-[12px] font-black text-slate-700">
                              <CalendarIcon size={12} className="text-slate-400 shrink-0" />
                              <span className="truncate">{item.receivedDate || '—'}</span>
                            </div>
                            {item.invoiceNo && <span className="text-[10px] text-indigo-500 font-bold mt-1.5 flex items-center gap-1 truncate" title={`Ref: ${item.invoiceNo}`}><Receipt size={10} className="shrink-0" /> Ref: {item.invoiceNo}</span>}
                          </div>
                        </td>
                        <td className="pl-2 pr-6 lg:pr-8 py-3.5 text-right align-middle">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-1 group-hover:translate-x-0" onClick={e => e.stopPropagation()}>
                            <ActionIconButton onClick={() => openViewModal(item)} title="Intelligence View" icon={Eye} tone="view" />
                            {!item.invoice_id && item.source !== 'Opening Balance' && !item.inv_id && (
                              <>
                                <ActionIconButton onClick={() => { setEditIncome(item); setOpenForm(true); }} title="Modify Entry" icon={Edit2} tone="edit" />
                                <ActionIconButton onClick={() => handleDelete(item.id)} title="Purge Record" icon={Trash2} tone="delete" />
                              </>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Payment Details Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/70 border-b border-slate-100">
                          <td colSpan="7" className="px-6 lg:px-8 py-6">
                            <div className="w-full bg-white rounded-3xl border border-slate-200/80 p-6 shadow-md space-y-6 animate-in fade-in duration-200">
                              {/* Header strip */}
                              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                    <span className="font-mono text-[13px] font-black text-indigo-600 italic">#INC-{item.id}</span>
                                    <h4 className="text-[16px] font-black text-slate-900 truncate">{item.source || 'General Revenue'}</h4>
                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md shrink-0">
                                      {item.category || 'General'}
                                    </span>
                                  </div>
                                  <p className="text-[12px] font-medium text-slate-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                                    <span>Customer: <strong className="font-bold text-slate-800">{getClientDisplayName(item.client, clients)}</strong></span>
                                    {item.invoiceNo && <span>• Invoice: <strong className="font-mono text-indigo-600 font-bold">{item.invoiceNo}</strong></span>}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  <span className={clsx(
                                    "px-3 py-1 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5",
                                    item.status === 'Fully Paid' || item.status === 'Received' ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                                    item.status === 'Partially Paid' || item.status === 'Partially Received' ? "bg-amber-50 text-amber-700 border border-amber-200" :
                                    "bg-slate-100 text-slate-700 border border-slate-200"
                                  )}>
                                    <span className={clsx("w-2 h-2 rounded-full shrink-0",
                                      item.status === 'Fully Paid' || item.status === 'Received' ? "bg-emerald-500" :
                                      item.status === 'Partially Paid' || item.status === 'Partially Received' ? "bg-amber-500" : "bg-slate-400"
                                    )} />
                                    {item.status}
                                  </span>
                                </div>
                              </div>

                              {/* 4 Summary Cards */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 min-w-0">
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total Payable</span>
                                  <span className="text-[18px] font-black text-slate-900 font-mono italic mt-1 block truncate">
                                    ₹{netTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                                <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 min-w-0">
                                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block">Amount Paid</span>
                                  <span className="text-[18px] font-black text-emerald-700 font-mono italic mt-1 block truncate">
                                    ₹{paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                                <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-100 min-w-0">
                                  <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest block">Outstanding</span>
                                  <span className="text-[18px] font-black text-amber-700 font-mono italic mt-1 block truncate">
                                    ₹{outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 min-w-0">
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Payment Account</span>
                                  <span className="text-[13px] font-black text-slate-800 truncate mt-1 block" title={bankDisplay}>
                                    {bankDisplay}
                                  </span>
                                </div>
                              </div>

                              {/* Payment History & Milestones Breakdown */}
                              <div className="space-y-3 pt-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <h5 className="text-[12px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                    <Receipt size={14} className="text-indigo-600" />
                                    <span>Payment Breakdown & History ({item.paymentType === 'split' ? 'Split Milestones' : 'Single Payment'})</span>
                                  </h5>
                                  <span className="text-[11px] font-bold text-slate-400">
                                    {outstanding === 0 ? "All payments completed" : `Remaining to be paid: ₹${outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                                  </span>
                                </div>

                                {item.paymentType === 'split' && item.extraInstallments?.length > 0 ? (
                                  <div className="border border-slate-200/80 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white">
                                    {item.extraInstallments.map((inst, i) => {
                                      const isPaid = inst.status === 'Paid' || inst.status === 'Received';
                                      return (
                                        <div key={i} className="flex flex-wrap sm:flex-nowrap items-center justify-between p-4 hover:bg-slate-50/50 transition-colors gap-3">
                                          <div className="flex items-center gap-4 min-w-0">
                                            <div className={clsx(
                                              "w-8 h-8 rounded-xl flex items-center justify-center text-[12px] font-black shrink-0",
                                              isPaid ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                                            )}>
                                              #{i + 1}
                                            </div>
                                            <div className="min-w-0">
                                              <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-[13px] font-black text-slate-800 truncate">
                                                  {inst.note || `Milestone #${i + 1}`}
                                                </span>
                                                <span className={clsx(
                                                  "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider shrink-0",
                                                  isPaid ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-slate-100 text-slate-600 border border-slate-200"
                                                )}>
                                                  {isPaid ? "Paid" : "Scheduled"}
                                                </span>
                                              </div>
                                              <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                                                <CalendarIcon size={12} className="text-slate-400 shrink-0" />
                                                <span>Due: {inst.date || 'N/A'}</span>
                                                {isPaid && inst.paidDate && <span className="text-emerald-700 font-bold">• Paid on {inst.paidDate}</span>}
                                                <span>• {inst.method === 'Cash' ? 'Cash Account' : (inst.bankName || 'Bank Account')}</span>
                                              </p>
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-4 shrink-0 ml-auto sm:ml-0">
                                            <span className="font-mono text-[16px] font-black text-slate-900 italic">
                                              ₹{Number(inst.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </span>
                                            {!isPaid && !isPartiallyPaid && !item.invoice_id && !item.inv_id && (
                                              <button
                                                type="button"
                                                onClick={() => setRecordPaymentData({ income: item, milestoneIndex: i })}
                                                className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-600 hover:text-white rounded-xl text-[11px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95"
                                              >
                                                Record Payment
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="p-4 bg-slate-50/60 rounded-2xl border border-slate-200/60 flex flex-wrap sm:flex-nowrap items-center justify-between gap-4">
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className={clsx("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", paid > 0 ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500")}>
                                        {paid > 0 ? <Check size={16} /> : <Clock size={16} />}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-[13px] font-black text-slate-800">
                                          {paid > 0 ? `Payment recorded on ${item.receivedDate || 'today'}` : "Pending Payment"}
                                        </p>
                                        <p className="text-[11px] text-slate-500 truncate">
                                          {paid > 0 ? `Received ₹${paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })} via ${bankDisplay}` : "No payment recorded yet. Record payment via Modify Entry."}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="shrink-0 ml-auto sm:ml-0">
                                      <span className="font-mono text-[16px] font-black text-slate-900 italic">
                                        ₹{paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
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

      {/* Main Income SlideOver Form */}
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

      {/* Intelligence View Modal */}
      <SlideOver
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title="Income Intelligence Details"
        size="2xl"
        footer={<div className="flex justify-end w-full px-2"><button onClick={() => setViewModalOpen(false)} className="px-8 py-2.5 bg-slate-900 text-white text-[13px] font-black rounded-xl hover:bg-black transition-all active:scale-95 shadow-lg shadow-slate-900/10">Close</button></div>}
      >
        {viewDetail && (() => {
          const netTotal = Number(viewDetail.netAmount || viewDetail.amount || 0);
          const paid = Number(viewDetail.paidAmount ?? (viewDetail.status === 'Fully Paid' || viewDetail.status === 'Received' ? netTotal : 0));
          const outstanding = Number(viewDetail.outstandingAmount ?? Math.max(0, netTotal - paid));
          const bankDisplay = getBankNameDisplay(viewDetail);

          return (
            <div className="space-y-8 pb-10">
              <div className="flex items-center gap-6 p-8 bg-gradient-to-br from-slate-900 to-indigo-950 rounded-3xl text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12"><Wallet size={120} /></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Treasury Record</p>
                  </div>
                  <h3 className="text-[26px] font-black tracking-tight italic">{viewDetail.source || 'General Revenue'}</h3>
                  <div className="flex items-center gap-4 mt-3">
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-2">
                      <CreditCard size={10} className="text-indigo-400" />
                      ID: <span className="font-mono text-white italic">{viewDetail.referenceNumber || viewDetail.transactionId || `#INC-${viewDetail.id}`}</span>
                    </p>
                  </div>
                </div>
              </div>

              {(() => {
                const isOB = viewDetail.source === 'Opening Balance' || viewDetail.category === 'Opening Balance' || (viewDetail.referenceNumber && String(viewDetail.referenceNumber).startsWith('BANK-OB-'));
                const clientDisplay = getClientDisplayName(viewDetail.client, clients);
                return (
                  <div className="grid grid-cols-2 gap-8 px-2">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                        {isOB ? "Account Name" : "Customer"}
                      </p>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-lg shadow-inner border border-indigo-100/50">
                          {clientDisplay?.[0] || viewDetail.client?.[0] || 'C'}
                        </div>
                        <div className="flex flex-col">
                          <p className="text-[16px] font-black text-slate-900 leading-none">{clientDisplay || (isOB ? 'Account' : 'Customer')}</p>
                          <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{viewDetail.category || 'General'}</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Total Payable</p>
                      <p className="text-[28px] font-black text-indigo-600 font-mono italic leading-none tracking-tighter">₹{netTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={clsx(
                          "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider",
                          viewDetail.status === 'Fully Paid' ? "bg-emerald-100 text-emerald-800" :
                          viewDetail.status === 'Partially Paid' ? "bg-amber-100 text-amber-800" : "bg-slate-200 text-slate-700"
                        )}>
                          {viewDetail.status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Amount Paid</span>
                  <span className="text-[18px] font-black text-emerald-700 font-mono italic mt-1 block">
                    ₹{paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Outstanding</span>
                  <span className="text-[18px] font-black text-amber-700 font-mono italic mt-1 block">
                    ₹{outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Bank / Account</span>
                  <span className="text-[13px] font-black text-slate-800 tracking-wide mt-1 block truncate" title={bankDisplay}>
                    {bankDisplay}
                  </span>
                </div>
              </div>

              {/* Account Ledger & Running Balance Banner */}
              {(() => {
                const sortedTxns = Array.isArray(viewDetail.transactions) && viewDetail.transactions.length > 0
                  ? [...viewDetail.transactions].sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0))
                  : [];
                const firstTx = sortedTxns.length > 0 ? sortedTxns[0] : null;
                const lastTx = sortedTxns.length > 0 ? sortedTxns[sortedTxns.length - 1] : null;
                const prevBalance = viewDetail.previous_balance ?? viewDetail.previousBalance ?? firstTx?.previous_balance ?? firstTx?.previousBalance;
                const currBalance = viewDetail.current_balance ?? viewDetail.currentBalance ?? lastTx?.current_balance ?? lastTx?.currentBalance;
                const isPaid = paid > 0 || viewDetail.status === 'Fully Paid' || viewDetail.status === 'Received';
                const txAmount = sortedTxns.length > 1 ? paid : Number(firstTx ? firstTx.amount : paid);

                return (
                  <div className="p-5 bg-gradient-to-br from-slate-50 to-indigo-50/40 rounded-2xl border border-indigo-100/70 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Landmark size={15} className="text-indigo-600" />
                        <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider">Account Ledger & Running Balance</span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-600 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200/60 truncate max-w-[220px]" title={bankDisplay}>
                        {bankDisplay}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 pt-1">
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200/70 shadow-sm">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Previous Balance</span>
                        <span className="text-[15px] font-black text-slate-700 font-mono italic mt-1 block">
                          {prevBalance != null ? `₹ ${Number(prevBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : "—"}
                        </span>
                      </div>
                      <div className="bg-white p-3.5 rounded-xl border border-emerald-100 shadow-sm">
                        <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest block">Transaction Amount</span>
                        <span className="text-[15px] font-black text-emerald-600 font-mono italic mt-1 block">
                          + ₹ {txAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="bg-white p-3.5 rounded-xl border border-indigo-100 shadow-sm">
                        <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest block">Current Balance</span>
                        <span className="text-[15px] font-black text-indigo-700 font-mono italic mt-1 block">
                          {currBalance != null ? `₹ ${Number(currBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : "—"}
                        </span>
                      </div>
                    </div>

                    {!isPaid && (
                      <p className="text-[10px] text-amber-600 font-semibold italic mt-1">
                        * Outstanding payment. Account balance movement will be finalized upon recording receipt.
                      </p>
                    )}
                  </div>
                );
              })()}

              <div className="space-y-3">
                <div className="px-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Source Description</p>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 text-[13px] text-slate-800 leading-relaxed font-semibold">
                    {getIncomeDescription(viewDetail)}
                  </div>
                </div>

                {(() => {
                  const userText = viewDetail.description || viewDetail.notes;
                  const sourceDesc = getIncomeDescription(viewDetail);
                  if (userText && userText !== sourceDesc && userText !== 'Opening Balance') {
                    return (
                      <div className="px-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Original User Remarks / Notes</p>
                        <div className="p-4 bg-white rounded-2xl border border-slate-200 text-[13px] text-slate-600 leading-relaxed font-medium">
                          {userText}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              {viewDetail.extraInstallments?.length > 0 && (
                <div className="px-2 space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Milestone Schedule</p>
                  <div className="space-y-2">
                    {viewDetail.extraInstallments.map((inst, i) => {
                      const matchedTx = Array.isArray(viewDetail.transactions)
                        ? viewDetail.transactions.find(t => 
                            (t.reference_id && (t.reference_id === inst.transactionId || t.reference_id === inst.transaction_id)) || 
                            (t.reference && (t.reference === inst.transactionId || t.reference === inst.transaction_id))
                          )
                        : null;
                      const instPrev = inst.previous_balance ?? inst.previousBalance ?? matchedTx?.previous_balance ?? matchedTx?.previousBalance;
                      const instCurr = inst.current_balance ?? inst.currentBalance ?? matchedTx?.current_balance ?? matchedTx?.currentBalance;

                      return (
                        <div key={i} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-2">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <span className="w-7 h-7 bg-indigo-50 text-indigo-700 font-black rounded-lg flex items-center justify-center text-[11px]">#{i + 1}</span>
                              <div>
                                <span className="text-[13px] font-black text-slate-900">{inst.date}</span>
                                <span className="text-[11px] text-slate-400 block">{inst.method === 'Cash' ? 'Cash Account' : (inst.bankName || 'Bank Account')}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={clsx(
                                "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider",
                                inst.status === 'Paid' ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                              )}>
                                {inst.status === 'Paid' ? "Paid" : "Pending"}
                              </span>
                              <span className="font-mono text-[15px] font-black text-slate-900">
                                ₹{Number(inst.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                          {inst.status === 'Paid' && (instPrev != null || instCurr != null) && (
                            <div className="flex items-center justify-between text-[11px] bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 font-mono">
                              <span className="text-slate-500">Prev: <strong className="text-slate-700">₹{Number(instPrev ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
                              <span className="text-emerald-600 font-black">+ ₹{Number(inst.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                              <span className="text-indigo-600">Curr: <strong className="text-indigo-700">₹{Number(instCurr ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </SlideOver>

      {/* Record Payment Modal */}
      {recordPaymentData && (
        <RecordPaymentModal
          isOpen={!!recordPaymentData}
          onClose={() => setRecordPaymentData(null)}
          income={recordPaymentData.income}
          milestoneIndex={recordPaymentData.milestoneIndex}
          bankAccounts={bankAccounts}
          onSuccess={invalidateTreasury}
        />
      )}
    </div>
  );
}
