import { useState, useEffect } from 'react';
import {
  Plus, Trash2, X, User, Layers, Landmark,
  Calendar as CalendarIcon, CheckCircle2, Loader2,
  ChevronDown, Save, FileText, Info, ChevronRight, Check,
  AlertCircle, Receipt, Smartphone, Upload, Image
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import SearchableSelect from './ui/SearchableSelect';
import { createInvoice, updateInvoice } from '../services/invoiceService';
import { getClients } from '../services/db';
import { getBankAccounts } from '../services/bankAccountService';
import { getProducts } from '../services/productService';

const emptyForm = {
  clientId: '',
  clientName: '',
  date: new Date().toISOString().split('T')[0],
  status: 'Pending',
  gst: 0,
  discountType: 'Flat',
  discountValue: '',
  bankAccountId: null,
  bankName: '',
  accountNumber: '',
  gpayNumber: '',
  initialDepositEnabled: false,
  initialDepositAmount: '',
  initialDepositBankId: null,
  initialDepositBankName: '',
  extraInstallments: [],
  operationalExpenses: [],
};

// ─── Reusable Field Components ──────────────────────────────────────────────

const FieldGroup = ({ label, hint, required, error, children }) => (
  <div className="space-y-1">
    <label className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-700">
      {label}
      {required && <span className="text-rose-500 text-[11px] font-black">required</span>}
    </label>
    {children}
    {hint && !error && (
      <p className="text-[11.5px] text-slate-400 flex items-center gap-1 ml-0.5">
        <Info size={11} /> {hint}
      </p>
    )}
    {error && (
      <p className="text-[11.5px] text-rose-500 flex items-center gap-1 ml-0.5 animate-in slide-in-from-top-1 duration-200">
        <AlertCircle size={11} /> {error}
      </p>
    )}
  </div>
);

const inputCls = (err) => clsx(
  "w-full px-4 py-3 bg-white border rounded-xl text-[14px] font-medium text-slate-800 placeholder:text-slate-300 outline-none transition-all duration-200",
  err
    ? "border-rose-300 ring-2 ring-rose-100 focus:border-rose-400"
    : "border-slate-200 hover:border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
);

const selectCls = (err) => clsx(
  "appearance-none",
  inputCls(err)
);

// ─── Step Configuration ──────────────────────────────────────────────────────
const STEPS = [
  { id: 'basic',    label: 'Basic Info',       icon: FileText, hint: 'Client & date' },
  { id: 'services', label: 'Line Items',        icon: Receipt,  hint: 'Services & pricing' },
  { id: 'bank',     label: 'Payment',          icon: Landmark, hint: 'Bank & deposit' },
];

// ─── Main Component ──────────────────────────────────────────────────────────
const InvoiceForm = ({ isOpen, onClose, onSave, invoice, nextInvoiceNumber, nextInvoiceNumberLoading }) => {
  const [clients, setClients]         = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [activeTab, setActiveTab]     = useState('basic');
  const [formData, setFormData]       = useState(emptyForm);
  const [products, setProducts]       = useState([]);
  const [items, setItems]             = useState([{ sNo: 1, serviceName: '', paymentStatus: 'Pending', amount: '' }]);
  const [errors, setErrors]           = useState({});
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [bankModalFor, setBankModalFor]   = useState(null);
  const [isSaving, setIsSaving]       = useState(false);
  const [qrFile, setQrFile]           = useState(null);
  const [qrPreview, setQrPreview]     = useState(null);

  useEffect(() => {
    if (isOpen) {
      Promise.all([
        getClients({ per_page: 100 }),
        getBankAccounts(),
        getProducts()
      ]).then(([cResult, b, p]) => {
        setClients(Array.isArray(cResult?.data ?? cResult) ? (cResult?.data ?? cResult) : []);
        setBankAccounts(Array.isArray(b) ? b : []);
        setProducts(Array.isArray(p) ? p : []);
      });
    }
  }, [isOpen]);

  const getBankDisplay = (id) => {
    if (id == null) return '';
    const b = bankAccounts.find((x) => String(x.id) === String(id));
    return b ? `${b.bankName} – ${b.accountNumber}` : '';
  };

  useEffect(() => {
    if (invoice && isOpen) {
      const extra = (invoice.extra_installments || []).map((i) => ({
        date: i.date || '', amount: i.amount != null ? String(i.amount) : '',
        bankAccountId: i.bank_account_id || null,
        bankName: getBankDisplay(i.bank_account_id) || i.bank_name || '',
        notes: i.notes || i.note || '',
      }));
      setFormData({
        ...emptyForm,
        clientId: invoice.client_id || invoice.clientId || '',
        clientName: invoice.client_name || invoice.clientName || '',
        date: typeof invoice.date === 'string' ? invoice.date.split('T')[0] : (invoice.date || ''),
        status: invoice.status || 'Pending',
        gst: parseFloat(invoice.gst || 0),
        discountType: invoice.discount_type || 'Flat',
        discountValue: invoice.discount != null ? String(invoice.discount) : '',
        bankAccountId: invoice.bank_account_id || null,
        bankName: invoice.bank_name || '',
        accountNumber: invoice.account_number || '',
        gpayNumber: invoice.gpay_number || '',
        initialDepositEnabled: !!(invoice.initial_deposit_enabled && parseFloat(invoice.initial_deposit_amount || 0) > 0),
        initialDepositAmount: invoice.initial_deposit_amount != null ? String(invoice.initial_deposit_amount) : '',
        initialDepositBankId: invoice.initial_deposit_bank_id || null,
        initialDepositBankName: getBankDisplay(invoice.initial_deposit_bank_id) || invoice.initial_deposit_bank_name || '',
        extraInstallments: extra,
        operationalExpenses: (invoice.operational_expenses || []).map((o) => ({
          name: o.name || '', amount: o.amount != null ? String(o.amount) : '',
          bankAccountId: o.bank_account_id ?? o.bankAccountId ?? null,
          bankName: getBankDisplay(o.bank_account_id ?? o.bankAccountId) || o.bank_name || '',
          paid: o.paid === true || o.paid === '1' || o.paid === 'Paid',
        })),
      });
      const invItems = invoice.items || [];
      setItems(invItems.length
        ? invItems.map((it, idx) => ({ sNo: idx + 1, serviceName: it.service_name || '', paymentStatus: it.payment_status || 'Pending', amount: it.amount != null ? String(it.amount) : '' }))
        : [{ sNo: 1, serviceName: '', paymentStatus: 'Pending', amount: '' }]);
    } else if (!invoice && isOpen) {
      setFormData(emptyForm);
      setItems([{ sNo: 1, serviceName: '', paymentStatus: 'Pending', amount: '' }]);
    }
    setActiveTab('basic');
    setErrors({});
    setIsSaving(false);
    setQrFile(null);
    setQrPreview(null);
  }, [invoice, isOpen, bankAccounts]);

  // ── Calculations ──────────────────────────────────────────────────────────
  const subtotal = items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const gstPct   = parseFloat(formData.gst) || 0;
  const taxAmt   = subtotal * (gstPct / 100);
  const discountVal = formData.discountType === 'Percentage'
    ? subtotal * ((parseFloat(formData.discountValue) || 0) / 100)
    : parseFloat(formData.discountValue) || 0;
  const totalAmount   = Math.max(0, subtotal - discountVal + taxAmt);
  const initialDeposit = formData.initialDepositEnabled ? (parseFloat(formData.initialDepositAmount) || 0) : 0;
  const installmentsTotal = (formData.extraInstallments || []).reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const balanceDue     = Math.max(0, totalAmount - initialDeposit - installmentsTotal);

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!formData.clientId)       e.clientId       = 'Please select a client';
    if (!formData.bankAccountId)  e.bankAccountId  = 'Please select a bank account';
    if (items.some((i) => !i.serviceName)) e.items = 'Each service needs a name';
    if (items.some((i) => !i.amount))      e.items = e.items || 'Each service needs an amount';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!validate()) {
      // Navigate to the first tab with errors
      if (errors.clientId) { setActiveTab('basic'); }
      else if (errors.items) { setActiveTab('services'); }
      else if (errors.bankAccountId) { setActiveTab('bank'); }
      toast.error('Please fill the required fields');
      return;
    }
    setIsSaving(true);
    const client = clients.find((c) => String(c.id) === String(formData.clientId));
    const data = new FormData();
    if (invoice?.id) data.append('id', invoice.id);
    data.append('client_id', formData.clientId);
    data.append('client_name', client ? (client.company_name || client.client_name) : formData.clientName);
    data.append('date', formData.date);
    data.append('status', formData.status);
    data.append('gst', formData.gst);
    data.append('discount_type', formData.discountType);
    data.append('discount', formData.discountValue || 0);
    data.append('bank_account_id', formData.bankAccountId);
    data.append('gpay_number', formData.gpayNumber || '');
    if (qrFile) data.append('qr_code', qrFile);
    data.append('initial_deposit_enabled', formData.initialDepositEnabled ? '1' : '0');
    data.append('initial_deposit_amount', formData.initialDepositAmount || '0');
    data.append('initial_deposit_bank_id', formData.initialDepositBankId || '');
    (formData.extraInstallments || []).forEach((row, i) => {
      data.append(`extra_installments[${i}][date]`, row.date || '');
      data.append(`extra_installments[${i}][amount]`, row.amount || '');
      data.append(`extra_installments[${i}][bank_account_id]`, row.bankAccountId || '');
      data.append(`extra_installments[${i}][notes]`, row.notes || '');
    });
    (formData.operationalExpenses || []).forEach((row, i) => {
      data.append(`operational_expenses[${i}][name]`, row.name || '');
      data.append(`operational_expenses[${i}][amount]`, row.amount || '');
      data.append(`operational_expenses[${i}][bank_account_id]`, row.bankAccountId || '');
      data.append(`operational_expenses[${i}][paid]`, row.paid ? '1' : '0');
    });
    items.forEach((item, i) => {
      data.append(`items[${i}][service_name]`, item.serviceName);
      data.append(`items[${i}][payment_status]`, item.paymentStatus);
      data.append(`items[${i}][amount]`, item.amount);
    });
    try {
      if (invoice?.id) { data.append('_method', 'PUT'); await updateInvoice(invoice.id, data); toast.success('✅ Invoice updated!'); }
      else             { await createInvoice(data); toast.success('✅ Invoice created!'); }
      onSave(); onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally { setIsSaving(false); }
  };

  if (!isOpen) return null;

  const activeIdx = STEPS.findIndex(s => s.id === activeTab);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const updateItem = (idx, field, val) => {
    const next = [...items];
    let updatedItem = { ...next[idx], [field]: val };

    if (field === 'serviceName') {
      const selectedProduct = products.find(p => p.name === val);
      if (selectedProduct) {
        updatedItem.amount = selectedProduct.price || '';
      }
    }

    next[idx] = updatedItem;
    setItems(next);
  };
  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx).map((it, i) => ({ ...it, sNo: i + 1 })));
  const addItem    = () => setItems([...items, { sNo: items.length + 1, serviceName: '', paymentStatus: 'Pending', amount: '' }]);

  const updateExpense = (idx, field, val) => {
    const next = [...formData.operationalExpenses]; next[idx] = { ...next[idx], [field]: val };
    setFormData({ ...formData, operationalExpenses: next });
  };

  const updateInstallment = (idx, field, val) => {
    const next = [...(formData.extraInstallments || [])];
    next[idx] = { ...next[idx], [field]: val };
    setFormData({ ...formData, extraInstallments: next });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-[1400px] rounded-t-[32px] sm:rounded-[32px] shadow-2xl flex flex-col h-[92vh] max-h-[95vh] border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-[0.98] duration-300">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-8 pt-8 pb-6 shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-9 w-9 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/30">
                <FileText size={18} className="text-white" />
              </div>
              <h2 className="text-[22px] font-extrabold text-slate-900 tracking-tight">
                {invoice ? 'Edit Invoice' : 'New Invoice'}
              </h2>
            </div>
            <p className="text-[13.5px] text-slate-400 font-medium ml-12">
              {invoice ? `Editing ${invoice.invoice_number}` : 'Fill in the details to generate an invoice'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 bg-slate-100 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full flex items-center justify-center transition-all active:scale-90"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* ── Sidebar Steps ─────────────────────────────────────────────── */}
          <aside className="w-64 border-r border-slate-100 bg-slate-50/70 p-4 shrink-0 overflow-y-auto custom-scrollbar">
            <div className="space-y-1.5">
              {STEPS.map((step, idx) => {
                const isActive = step.id === activeTab;
                const isDone = idx < activeIdx;
                const StepIcon = step.icon;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setActiveTab(step.id)}
                    className={clsx(
                      "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all border",
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
                    <div className="min-w-0">
                      <p className={clsx(
                        "text-[13px] font-bold leading-tight",
                        isActive ? "text-brand-700" : isDone ? "text-emerald-700" : "text-slate-700"
                      )}>
                        {step.label}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{step.hint}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* ── Content ───────────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-8 pb-4 pt-2 custom-scrollbar">

          {/* Step 1: Basic Info */}
          {activeTab === 'basic' && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-3 duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Invoice Number */}
                <FieldGroup label="Invoice Number" hint="Auto-assigned when saved">
                  <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                    <Receipt size={16} className="text-slate-300 shrink-0" />
                    <span className="text-[14px] text-slate-400 font-medium">
                      {invoice ? invoice.invoice_number : (nextInvoiceNumberLoading ? 'Generating…' : nextInvoiceNumber || 'Auto Generated')}
                    </span>
                  </div>
                </FieldGroup>

                {/* Client */}
                <FieldGroup label="Client" required hint="Who is this invoice for?" error={errors.clientId}>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                    <select
                      value={formData.clientId}
                      onChange={(e) => {
                        const c = clients.find((x) => String(x.id) === String(e.target.value));
                        setFormData({ ...formData, clientId: e.target.value, clientName: c ? (c.company_name || c.client_name) : '' });
                        if (errors.clientId) setErrors({ ...errors, clientId: '' });
                      }}
                      className={clsx(selectCls(errors.clientId), "pl-10 pr-10")}
                    >
                      <option value="">Select a client…</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>{c.company_name || c.client_name}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                  </div>
                </FieldGroup>

                {/* Date */}
                <FieldGroup label="Invoice Date" hint="Default is today">
                  <div className="relative">
                    <CalendarIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className={clsx(inputCls(false), "pl-10")}
                    />
                  </div>
                </FieldGroup>

                {/* Status */}
                <FieldGroup label="Payment Status" hint="Current state of this invoice">
                  <div className="relative">
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className={clsx(selectCls(false), "pl-4 pr-10")}
                    >
                      <option value="Pending">🕐 Pending</option>
                      <option value="Paid">✅ Paid</option>
                      <option value="Overdue">⚠️ Overdue</option>
                      <option value="Draft">📝 Draft</option>
                    </select>
                    <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                  </div>
                </FieldGroup>
              </div>

              {/* Next Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('services')}
                  className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white text-[13.5px] font-bold rounded-xl hover:bg-brand-700 transition-all active:scale-95 shadow-lg shadow-brand-500/20"
                >
                  Next: Add Services <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Line Items */}
          {activeTab === 'services' && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-3 duration-300">
              <div>
                <p className="text-[13px] text-slate-500 font-medium mb-4">
                  Add the services or products you provided. Each row becomes a line item on the invoice.
                </p>

                {errors.items && (
                  <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-600 text-[13px] font-semibold px-4 py-2.5 rounded-xl mb-4">
                    <AlertCircle size={14} /> {errors.items}
                  </div>
                )}

                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 group bg-slate-50/60 border border-slate-100 hover:border-slate-200 rounded-2xl px-4 py-3 transition-all">
                      <span className="text-[12px] font-black text-slate-300 w-5 shrink-0 text-center">{idx + 1}</span>
                      <SearchableSelect
                        options={products}
                        value={item.serviceName}
                        onChange={(val) => updateItem(idx, 'serviceName', val)}
                        placeholder="Service or product name…"
                        className="flex-1"
                      />
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[13px] font-bold text-slate-400">₹</span>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={item.amount}
                          onChange={(e) => updateItem(idx, 'amount', e.target.value)}
                          className="w-28 bg-transparent border-none outline-none text-[14px] font-black text-slate-900 text-right placeholder:text-slate-300"
                        />
                      </div>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="h-7 w-7 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addItem}
                  className="mt-3 flex items-center gap-2 text-[13px] font-bold text-brand-600 hover:text-brand-700 px-4 py-2 hover:bg-brand-50 rounded-xl transition-all active:scale-95"
                >
                  <Plus size={16} />  Add another service
                </button>
              </div>

              {/* Pricing Summary */}
              <div className="bg-slate-900 rounded-2xl p-5 text-white space-y-3">
                <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 mb-3">Price Breakdown</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Discount</label>
                    <div className="flex gap-2">
                      <select
                        value={formData.discountType}
                        onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                        className="flex-1 bg-slate-800 border border-slate-700 text-[13px] font-semibold text-white rounded-lg px-3 py-2 outline-none focus:border-brand-400"
                      >
                        <option value="Flat">Flat (₹)</option>
                        <option value="Percentage">Percent (%)</option>
                      </select>
                      <input
                        type="number"
                        placeholder="0"
                        value={formData.discountValue}
                        onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                        className="w-24 bg-slate-800 border border-slate-700 text-[13px] font-bold text-white rounded-lg px-3 py-2 outline-none focus:border-brand-400 text-right"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">GST Rate</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="0"
                        value={formData.gst}
                        onChange={(e) => setFormData({ ...formData, gst: e.target.value })}
                        className="flex-1 bg-slate-800 border border-slate-700 text-[13px] font-bold text-white rounded-lg px-3 py-2 outline-none focus:border-brand-400"
                      />
                      <span className="text-slate-400 font-bold text-sm">%</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-700 pt-3 mt-2 space-y-1.5">
                  <div className="flex justify-between text-[13px] text-slate-400">
                    <span>Subtotal</span><span className="font-semibold text-white">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  {discountVal > 0 && (
                    <div className="flex justify-between text-[13px] text-emerald-400">
                      <span>Discount</span><span>- ₹{discountVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {taxAmt > 0 && (
                    <div className="flex justify-between text-[13px] text-slate-400">
                      <span>GST ({gstPct}%)</span><span className="text-white">+ ₹{taxAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[18px] font-black pt-1 border-t border-slate-700">
                    <span>Total</span><span className="text-brand-400">₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <button type="button" onClick={() => setActiveTab('basic')} className="flex items-center gap-1.5 px-5 py-2.5 text-slate-500 hover:text-slate-700 text-[13.5px] font-bold transition-all">
                  ← Back
                </button>
                <button type="button" onClick={() => setActiveTab('bank')} className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white text-[13.5px] font-bold rounded-xl hover:bg-brand-700 transition-all active:scale-95 shadow-lg shadow-brand-500/20">
                  Next: Payment Details <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Payment / Bank */}
          {activeTab === 'bank' && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-3 duration-300">
              <p className="text-[13px] text-slate-500 font-medium">
                Select where the payment will be received. Optionally record an advance payment.
              </p>

              {/* Bank Account */}
              <FieldGroup label="Receiving Bank Account" required hint="Payment will be directed to this account" error={errors.bankAccountId}>
                <div className="relative">
                  <Landmark size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                  <select
                    value={formData.bankAccountId || ''}
                    onChange={(e) => {
                      const id = e.target.value ? Number(e.target.value) : null;
                      const b  = bankAccounts.find((x) => String(x.id) === String(id));
                      setFormData({ ...formData, bankAccountId: id, bankName: b?.bankName || '', accountNumber: b?.accountNumber || '' });
                      if (errors.bankAccountId) setErrors({ ...errors, bankAccountId: '' });
                    }}
                    className={clsx(selectCls(errors.bankAccountId), "pl-10 pr-10")}
                  >
                    <option value="">Choose a bank account…</option>
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>{b.bankName} — {b.accountNumber}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                </div>
              </FieldGroup>

              {/* GPay Number + QR Upload */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* GPay Number */}
                <FieldGroup label="GPay / UPI Number" hint="Client can pay via this UPI ID or number">
                  <div className="relative">
                    <Smartphone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="e.g. 9876543210 or name@upi"
                      value={formData.gpayNumber}
                      onChange={(e) => setFormData({ ...formData, gpayNumber: e.target.value })}
                      className={clsx(inputCls(false), 'pl-10')}
                    />
                  </div>
                </FieldGroup>

                {/* QR Code Upload */}
                <FieldGroup label="Payment QR Code" hint="Upload a QR image for client to scan">
                  <label className="block cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 2 * 1024 * 1024) {
                          toast.error('QR image must be under 2 MB');
                          return;
                        }
                        setQrFile(file);
                        const reader = new FileReader();
                        reader.onload = (ev) => setQrPreview(ev.target.result);
                        reader.readAsDataURL(file);
                      }}
                    />
                    {qrPreview ? (
                      <div className="relative w-full h-[112px] border-2 border-brand-300 rounded-2xl overflow-hidden group">
                        <img src={qrPreview} alt="QR Preview" className="w-full h-full object-contain bg-slate-50" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-1">
                          <Upload size={18} className="text-white" />
                          <span className="text-white text-[11px] font-bold">Change QR</span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-[112px] border-2 border-dashed border-slate-200 hover:border-brand-300 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all bg-slate-50 hover:bg-brand-50/30 group">
                        <div className="h-9 w-9 bg-white border border-slate-200 rounded-xl flex items-center justify-center shadow-sm group-hover:border-brand-200 transition-all">
                          <Image size={18} className="text-slate-400 group-hover:text-brand-500" />
                        </div>
                        <span className="text-[12px] font-semibold text-slate-400 group-hover:text-brand-500 transition-colors">Click to upload QR</span>
                        <span className="text-[10.5px] text-slate-300">PNG, JPG up to 2 MB</span>
                      </div>
                    )}
                  </label>
                  {qrPreview && (
                    <button
                      type="button"
                      onClick={() => { setQrFile(null); setQrPreview(null); }}
                      className="flex items-center gap-1 text-[11.5px] font-bold text-rose-500 hover:text-rose-600 mt-1 ml-0.5 transition-colors"
                    >
                      <X size={12} /> Remove QR
                    </button>
                  )}
                </FieldGroup>
              </div>

              {/* Advance / Initial Deposit toggle */}
              <div
                onClick={() => setFormData({ ...formData, initialDepositEnabled: !formData.initialDepositEnabled })}
                className={clsx(
                  "flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all",
                  formData.initialDepositEnabled ? "bg-brand-50 border-brand-200" : "bg-slate-50 border-slate-100 hover:border-slate-200"
                )}
              >
                <div className={clsx(
                  "h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0",
                  formData.initialDepositEnabled ? "bg-brand-600 border-brand-600 shadow-md shadow-brand-500/30" : "bg-white border-slate-300"
                )}>
                  {formData.initialDepositEnabled && <Check size={14} className="text-white" />}
                </div>
                <div>
                  <p className="text-[14px] font-bold text-slate-800">Client paid an advance / deposit</p>
                  <p className="text-[12px] text-slate-400 font-medium">Enable this to record a partial upfront payment</p>
                </div>
              </div>

              {formData.initialDepositEnabled && (
                <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-brand-200 ml-3 animate-in slide-in-from-top-2 duration-200">
                  <FieldGroup label="Advance Amount (₹)" hint="How much was paid upfront?">
                    <input
                      type="number"
                      placeholder="e.g. 5000"
                      value={formData.initialDepositAmount}
                      onChange={(e) => setFormData({ ...formData, initialDepositAmount: e.target.value })}
                      className={inputCls(false)}
                    />
                  </FieldGroup>
                  <FieldGroup label="Received In" hint="Which account?">
                    <button
                      type="button"
                      onClick={() => { setBankModalFor('initial'); setBankModalOpen(true); }}
                      className={clsx(inputCls(false), "text-left flex items-center justify-between")}
                    >
                      <span className={formData.initialDepositBankName ? 'text-slate-800' : 'text-slate-300'}>
                        {formData.initialDepositBankName || getBankDisplay(formData.initialDepositBankId) || 'Select account…'}
                      </span>
                      <ChevronDown size={14} className="text-slate-300" />
                    </button>
                  </FieldGroup>
                </div>
              )}

              </div>

              {/* Balance summary */}
              {/* Installments Section */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[14px] font-bold text-slate-800">Additional Payments / Installments</p>
                    <p className="text-[12px] text-slate-400 font-medium">Record further payments received for this invoice</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, extraInstallments: [...(formData.extraInstallments || []), { date: new Date().toISOString().split('T')[0], amount: '', bankAccountId: null, bankName: '', notes: '' }] })}
                    className="flex items-center gap-1.5 text-[12.5px] font-bold text-emerald-600 hover:text-emerald-700 px-3 py-1.5 hover:bg-emerald-50 rounded-lg transition-all"
                  >
                    <Plus size={14} /> Add payment
                  </button>
                </div>

                {(formData.extraInstallments || []).length > 0 && (
                  <div className="space-y-3">
                    {formData.extraInstallments.map((row, idx) => (
                      <div key={idx} className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 animate-in slide-in-from-top-2 duration-200 group relative">
                        <div className="grid grid-cols-2 gap-4">
                          <FieldGroup label="Amount (₹)">
                            <input
                              type="number"
                              placeholder="0.00"
                              value={row.amount}
                              onChange={(e) => updateInstallment(idx, 'amount', e.target.value)}
                              className={inputCls(false)}
                            />
                          </FieldGroup>
                          <FieldGroup label="Date Received">
                            <input
                              type="date"
                              value={row.date}
                              onChange={(e) => updateInstallment(idx, 'date', e.target.value)}
                              className={inputCls(false)}
                            />
                          </FieldGroup>
                          <FieldGroup label="Received In">
                            <button
                              type="button"
                              onClick={() => { setBankModalFor(`installment-${idx}`); setBankModalOpen(true); }}
                              className={clsx(inputCls(false), "text-left flex items-center justify-between")}
                            >
                              <span className={row.bankName ? 'text-slate-800' : 'text-slate-300'}>
                                {row.bankName || 'Select account…'}
                              </span>
                              <ChevronDown size={14} className="text-slate-300" />
                            </button>
                          </FieldGroup>
                          <FieldGroup label="Notes (optional)">
                            <input
                              type="text"
                              placeholder="e.g. 2nd installment"
                              value={row.notes}
                              onChange={(e) => updateInstallment(idx, 'notes', e.target.value)}
                              className={inputCls(false)}
                            />
                          </FieldGroup>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, extraInstallments: formData.extraInstallments.filter((_, i) => i !== idx) })}
                          className="absolute -top-2 -right-2 h-7 w-7 bg-white shadow-md text-slate-300 hover:text-rose-500 rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 border border-slate-100"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Balance summary */}
              {(initialDeposit > 0 || installmentsTotal > 0) && (
                <div className="mt-4 flex items-center justify-between px-6 py-4 bg-amber-50 border border-amber-200 rounded-[24px] shadow-sm">
                  <div>
                    <span className="text-[14px] font-bold text-amber-700 block">Total Remaining Balance</span>
                    <p className="text-[11px] text-amber-600 font-medium">After all recorded payments & installments</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[20px] font-black text-amber-600 block">₹{balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    {balanceDue === 0 && (
                      <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider bg-emerald-100 px-2 py-0.5 rounded-md">Fully Paid</span>
                    )}
                  </div>
                </div>
              )}

              {/* Operational Expenses (collapsible feel) */}
              <div className="mt-2">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[13.5px] font-bold text-slate-700">Operational Expenses <span className="text-slate-400 font-normal">(optional)</span></p>
                    <p className="text-[11.5px] text-slate-400 font-medium">Internal costs related to this invoice</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, operationalExpenses: [...(formData.operationalExpenses || []), { name: '', amount: '', bankAccountId: null, bankName: '', paid: false }] })}
                    className="flex items-center gap-1.5 text-[12.5px] font-bold text-brand-600 hover:text-brand-700 px-3 py-1.5 hover:bg-brand-50 rounded-lg transition-all"
                  >
                    <Plus size={14} /> Add expense
                  </button>
                </div>

                {(formData.operationalExpenses || []).length > 0 && (
                  <div className="space-y-2.5">
                    {formData.operationalExpenses.map((row, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 group">
                        <input
                          type="text"
                          placeholder="e.g. Travel, Materials…"
                          value={row.name}
                          onChange={(e) => updateExpense(idx, 'name', e.target.value)}
                          className="flex-1 bg-transparent border-none outline-none text-[13.5px] font-semibold text-slate-800 placeholder:text-slate-300"
                        />
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[12px] font-bold text-slate-400">₹</span>
                          <input
                            type="number"
                            placeholder="0"
                            value={row.amount}
                            onChange={(e) => updateExpense(idx, 'amount', e.target.value)}
                            className="w-20 bg-transparent border-none outline-none text-[13.5px] font-black text-slate-900 text-right placeholder:text-slate-300"
                          />
                        </div>
                        <select
                          value={row.paid ? 'Paid' : 'Unpaid'}
                          onChange={(e) => updateExpense(idx, 'paid', e.target.value === 'Paid')}
                          className={clsx(
                            "text-[11px] font-extrabold px-2.5 py-1 rounded-lg border outline-none transition-all",
                            row.paid ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"
                          )}
                        >
                          <option value="Unpaid">UNPAID</option>
                          <option value="Paid">PAID</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, operationalExpenses: formData.operationalExpenses.filter((_, i) => i !== idx) })}
                          className="h-7 w-7 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-start pt-2">
                <button type="button" onClick={() => setActiveTab('services')} className="flex items-center gap-1.5 px-5 py-2.5 text-slate-500 hover:text-slate-700 text-[13.5px] font-bold transition-all">
                  ← Back
                </button>
              </div>
            </div>
          )}
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="shrink-0 px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-4">
          {/* Total summary pill */}
          <div className="flex flex-col">
            <span className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-widest">Invoice Total</span>
            <span className="text-[22px] font-black text-slate-900 leading-tight">
              ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            {(initialDeposit > 0 || installmentsTotal > 0) && (
              <span className="text-[11px] text-slate-400 font-medium">Balance: ₹{balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-white border border-slate-200 text-slate-600 text-[14px] font-bold rounded-xl hover:bg-slate-50 transition-all active:scale-95"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSubmit}
              className="flex items-center gap-2.5 px-8 py-3 bg-brand-600 hover:bg-brand-700 text-white text-[14px] font-extrabold rounded-xl shadow-xl shadow-brand-500/25 hover:shadow-brand-500/40 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {isSaving ? 'Saving…' : invoice ? 'Save Changes' : 'Create Invoice'}
            </button>
          </div>
        </div>

        {/* ── Bank Modal ──────────────────────────────────────────────────── */}
        {bankModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <div className="bg-white rounded-[28px] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
              <div className="px-6 py-5 border-b border-slate-50 flex justify-between items-center">
                <div>
                  <h3 className="text-[16px] font-extrabold text-slate-900">Select Bank Account</h3>
                  <p className="text-[12px] text-slate-400 font-medium mt-0.5">Where was the payment received?</p>
                </div>
                <button onClick={() => setBankModalOpen(false)} className="h-8 w-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full flex items-center justify-center transition-all">
                  <X size={16} />
                </button>
              </div>
              <div className="p-4 space-y-2 max-h-[55vh] overflow-y-auto custom-scrollbar">
                {bankAccounts.length === 0
                  ? <p className="text-center text-slate-400 text-[13px] py-8">No bank accounts found.</p>
                  : bankAccounts.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        const name = `${b.bankName} – ${b.accountNumber}`;
                        if (bankModalFor === 'initial') {
                          setFormData((prev) => ({ ...prev, initialDepositBankId: b.id, initialDepositBankName: name }));
                        } else if (typeof bankModalFor === 'string' && bankModalFor.startsWith('installment-')) {
                          const idx = parseInt(bankModalFor.split('-')[1]);
                          const next = [...(formData.extraInstallments || [])];
                          next[idx] = { ...next[idx], bankAccountId: b.id, bankName: name };
                          setFormData((prev) => ({ ...prev, extraInstallments: next }));
                        }
                        setBankModalOpen(false);
                      }}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-100 hover:border-brand-200 hover:bg-brand-50/40 text-left transition-all group"
                    >
                      <div className="h-10 w-10 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center group-hover:bg-brand-100 group-hover:text-brand-600 transition-colors shrink-0">
                        <Landmark size={18} />
                      </div>
                      <div>
                        <p className="text-[14px] font-bold text-slate-900">{b.bankName}</p>
                        <p className="text-[12px] text-slate-400 font-medium font-mono">…{String(b.accountNumber).slice(-4)}</p>
                      </div>
                    </button>
                  ))
                }
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceForm;
