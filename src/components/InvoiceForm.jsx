import { useState, useEffect } from 'react';
import {
  Plus, Trash2, Landmark, Loader2, Save, FileText, Receipt, Layers,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import SearchableSelect from './ui/SearchableSelect';
import { createInvoice, updateInvoice } from '../services/invoiceService';
import { getClients } from '../services/db';
import { getBankAccounts } from '../services/bankAccountService';
import { getProducts } from '../services/productService';
import SlideOver from './ui/SlideOver';

const emptyForm = {
  clientId: '',
  clientName: '',
  date: new Date().toISOString().split('T')[0],
  status: 'Draft',
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
  invoice_no: '',
  reference_number: '',
  notes: '',
};

const STEPS = [
  { id: 'basic', label: 'Basic Info', icon: FileText },
  { id: 'services', label: 'Line Items', icon: Receipt },
  { id: 'bank', label: 'Payment', icon: Landmark },
];

const InvoiceForm = ({ isOpen, onClose, onSave, invoice, nextInvoiceNumber, nextInvoiceNumberLoading }) => {
  const [clients, setClients] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState(emptyForm);
  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([{ sNo: 1, serviceName: '', paymentStatus: 'Pending', amount: '' }]);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

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
        status: invoice.status || 'Draft',
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
        invoice_no: invoice.invoice_no || '',
        reference_number: invoice.reference_number || '',
        notes: invoice.notes || '',
      });
      const invItems = invoice.items || [];
      setItems(invItems.length
        ? invItems.map((it, idx) => ({ sNo: idx + 1, serviceName: it.service_name || '', paymentStatus: it.payment_status || 'Pending', amount: it.amount != null ? String(it.amount) : '' }))
        : [{ sNo: 1, serviceName: '', paymentStatus: 'Pending', amount: '' }]);
    } else if (!invoice && isOpen) {
      setFormData({ ...emptyForm, invoice_no: nextInvoiceNumber || '' });
      setItems([{ sNo: 1, serviceName: '', paymentStatus: 'Pending', amount: '' }]);
    }
    setActiveTab('basic');
    setErrors({});
    setIsSaving(false);
  }, [invoice, isOpen, bankAccounts, nextInvoiceNumber]);

  const subtotal = items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const gstPct   = parseFloat(formData.gst) || 0;
  const taxAmt   = subtotal * (gstPct / 100);
  const discountVal = formData.discountType === 'Percentage'
    ? subtotal * ((parseFloat(formData.discountValue) || 0) / 100)
    : parseFloat(formData.discountValue) || 0;
  const totalAmount   = Math.max(0, subtotal - discountVal + taxAmt);
  const initialDeposit = formData.initialDepositEnabled ? (parseFloat(formData.initialDepositAmount) || 0) : 0;
  const installmentsTotal = (formData.extraInstallments || []).reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const totalPaid = initialDeposit + installmentsTotal;
  const balanceDue     = Math.max(0, totalAmount - totalPaid);

  const validate = () => {
    const e = {};
    if (!formData.clientId)       e.clientId       = 'Select a client';
    if (!formData.bankAccountId)  e.bankAccountId  = 'Select a bank account';
    if (items.some((i) => !i.serviceName)) e.items = 'Each service needs a name';
    if (items.some((i) => !i.amount))      e.items = e.items || 'Each service needs an amount';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!validate()) {
      if (errors.clientId) setActiveTab('basic');
      else if (errors.items) setActiveTab('services');
      else if (errors.bankAccountId) setActiveTab('bank');
      toast.error('Please fix errors');
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
    data.append('initial_deposit_enabled', formData.initialDepositEnabled ? '1' : '0');
    data.append('initial_deposit_amount', formData.initialDepositAmount || '0');
    data.append('initial_deposit_bank_id', formData.initialDepositBankId || '');
    data.append('invoice_no', formData.invoice_no);
    data.append('reference_number', formData.reference_number);
    data.append('notes', formData.notes);

    (formData.extraInstallments || []).forEach((row, i) => {
      data.append(`extra_installments[${i}][date]`, row.date || '');
      data.append(`extra_installments[${i}][amount]`, row.amount || '');
      data.append(`extra_installments[${i}][bank_account_id]`, row.bankAccountId || '');
      data.append(`extra_installments[${i}][notes]`, row.notes || '');
    });
    items.forEach((item, i) => {
      data.append(`items[${i}][service_name]`, item.serviceName);
      data.append(`items[${i}][payment_status]`, item.paymentStatus);
      data.append(`items[${i}][amount]`, item.amount);
    });

    try {
      if (invoice?.id) { data.append('_method', 'PUT'); await updateInvoice(invoice.id, data); toast.success('Invoice updated'); }
      else             { await createInvoice(data); toast.success('Invoice created'); }
      onSave(); onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setIsSaving(false); }
  };

  const updateItem = (idx, field, val) => {
    const next = [...items];
    let updatedItem = { ...next[idx], [field]: val };
    if (field === 'serviceName') {
      const selectedProduct = products.find(p => p.name === val);
      if (selectedProduct) updatedItem.amount = selectedProduct.price || '';
    }
    next[idx] = updatedItem;
    setItems(next);
  };
  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx).map((it, i) => ({ ...it, sNo: i + 1 })));
  const addItem    = () => setItems([...items, { sNo: items.length + 1, serviceName: '', paymentStatus: 'Pending', amount: '' }]);

  const updateInstallment = (idx, field, val) => {
    const next = [...(formData.extraInstallments || [])];
    next[idx] = { ...next[idx], [field]: val };
    setFormData({ ...formData, extraInstallments: next });
  };

  return (
    <SlideOver
      isOpen={isOpen}
      onClose={onClose}
      title={invoice ? 'Modify Financial Invoice' : 'Generate New Invoice'}
      size="5xl"
      footer={(
        <div className="flex justify-between items-center w-full px-1">
          <div className="flex items-center gap-8">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aggregate Invoice Value</span>
              <span className="text-[22px] font-black text-slate-900 font-mono italic leading-none mt-1">₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="w-px h-8 bg-slate-200 hidden md:block" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Outstanding Balance</span>
              <span className={clsx(
                "text-[22px] font-black font-mono italic leading-none mt-1",
                balanceDue > 0 ? "text-rose-600" : "text-emerald-600"
              )}>
                ₹{balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-6 py-2.5 text-[14px] font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-all">Cancel</button>
            <button
              onClick={handleSubmit}
              disabled={isSaving}
              className="px-10 py-2.5 bg-indigo-600 text-white text-[14px] font-black rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95"
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              <span>{isSaving ? 'Synchronizing...' : 'Save Invoice'}</span>
            </button>
          </div>
        </div>
      )}
    >
      <div className="flex h-full min-h-[600px] relative">
        {/* Sidebar Navigation */}
        <div className="w-64 border-r-2 border-slate-100 pr-6 shrink-0 hidden md:block">
          <div className="flex flex-col gap-2 sticky top-0">
            {STEPS.map((step, idx) => {
              const StepIcon = step.id === 'basic' ? FileText : (step.id === 'services' ? Receipt : Landmark);
              return (
                <div key={step.id}>
                  <button
                    onClick={() => setActiveTab(step.id)}
                    className={clsx(
                      "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-[0.15em] transition-all relative group",
                      activeTab === step.id
                        ? "bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100 ring-1 ring-indigo-200/50"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    {activeTab === step.id && (
                      <div className="absolute -right-[26px] top-3 bottom-3 w-1 bg-indigo-600 rounded-l-full z-10" />
                    )}
                    <StepIcon className={clsx("h-4 w-4", activeTab === step.id ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600")} />
                    <span>{step.label}</span>
                  </button>
                  {idx < STEPS.length - 1 && <div className="h-px bg-slate-50 mx-4 my-1 opacity-50" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 pl-10">
          <div className="pb-20">
            {activeTab === 'basic' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="grid grid-cols-2 gap-8">
                  <div className="col-span-2">
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Client Selection</label>
                    <SearchableSelect
                      options={clients.map(c => ({ id: c.id, name: c.company_name || c.client_name }))}
                      value={formData.clientId}
                      onChange={(val) => {
                        const c = clients.find(x => String(x.id) === String(val));
                        setFormData({ ...formData, clientId: val, clientName: c ? (c.company_name || c.client_name) : '' });
                      }}
                      placeholder="Select client registry..."
                    />
                    {errors.clientId && <p className="text-[10px] text-rose-500 font-bold uppercase mt-1.5">{errors.clientId}</p>}
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Invoice Number</label>
                    <input
                      type="text"
                      value={formData.invoice_no || ''}
                      onChange={(e) => setFormData({ ...formData, invoice_no: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-bold outline-none focus:border-indigo-500 transition-all"
                      placeholder="INV-2024-001"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Issue Date</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-bold outline-none focus:border-indigo-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Reference / PO</label>
                    <input
                      type="text"
                      value={formData.reference_number || ''}
                      onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-bold outline-none focus:border-indigo-500 transition-all"
                      placeholder="External PO Number"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Financial Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-bold outline-none focus:border-indigo-500 transition-all appearance-none"
                    >
                      <option value="Draft">Draft</option>
                      <option value="Sent">Sent</option>
                      <option value="Paid">Fully Paid</option>
                      <option value="Partial">Partially Paid</option>
                      <option value="Overdue">Overdue</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Administrative Notes</label>
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-medium outline-none focus:border-indigo-500 transition-all min-h-[120px] resize-none"
                    placeholder="Add terms, conditions or internal notes..."
                  />
                </div>
              </div>
            )}

            {activeTab === 'services' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                  <div className="flex flex-col">
                    <h4 className="text-[14px] font-black text-slate-900 uppercase tracking-widest">Invoice Line Items</h4>
                    <p className="text-[11px] font-bold text-slate-400 uppercase mt-1">Specify products and services rendered</p>
                  </div>
                  <button
                    type="button"
                    onClick={addItem}
                    className="px-5 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl text-[12px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm flex items-center gap-2 border border-indigo-100 group"
                  >
                    <Plus size={16} className="group-hover:rotate-90 transition-transform" />
                    <span>Add Line Item</span>
                  </button>
                </div>
                <div className="space-y-6">
                  {items.map((item, idx) => (
                    <div key={idx} className="bg-slate-50/50 border border-slate-200 rounded-2xl p-6 space-y-6 relative group shadow-sm hover:border-indigo-200 transition-colors">
                      <div className="grid grid-cols-12 gap-6">
                        <div className="col-span-8">
                          <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Item Name</label>
                          <SearchableSelect
                            options={products.map(p => ({ id: p.name, name: p.name }))}
                            value={item.serviceName}
                            onChange={v => updateItem(idx, 'serviceName', v)}
                            placeholder="Search catalog..."
                          />
                        </div>
                        <div className="col-span-4">
                          <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Unit Price (₹)</label>
                          <input
                            type="number"
                            value={item.amount}
                            onChange={(e) => updateItem(idx, 'amount', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-black italic outline-none focus:border-indigo-500 transition-all"
                          />
                        </div>
                      </div>
                      <div className="flex justify-between items-center pt-4 border-t border-slate-200/60">
                        <div className="flex gap-8">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase">Status</span>
                            <select
                              value={item.paymentStatus}
                              onChange={e => updateItem(idx, 'paymentStatus', e.target.value)}
                              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold"
                            >
                              <option value="Pending">Pending</option>
                              <option value="Paid">Paid</option>
                            </select>
                          </div>
                        </div>
                        <span className="font-mono text-[18px] font-black text-slate-900 italic">₹{(parseFloat(item.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <button onClick={() => removeItem(idx)} className="absolute -top-3 -right-3 h-10 w-10 bg-white text-rose-500 rounded-xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 shadow-xl border border-slate-100">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="p-8 bg-slate-900 rounded-[32px] text-white space-y-4">
                  <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest text-slate-400">
                    <span>Subtotal</span>
                    <span className="text-white">₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-8 pt-4 border-t border-slate-800">
                    <div>
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">GST (%)</label>
                      <input type="number" value={formData.gst} onChange={(e) => setFormData({ ...formData, gst: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-[13px] font-bold outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Discount</label>
                      <div className="flex gap-2">
                        <select value={formData.discountType} onChange={(e) => setFormData({ ...formData, discountType: e.target.value })} className="bg-slate-800 border border-slate-700 rounded-xl px-2 text-[13px] font-bold outline-none">
                          <option value="Flat">₹</option>
                          <option value="Percentage">%</option>
                        </select>
                        <input type="number" value={formData.discountValue} onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-[13px] font-bold outline-none focus:border-indigo-500" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'bank' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="bg-slate-900 rounded-3xl p-10 text-white space-y-6 shadow-2xl border border-slate-800 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 blur-[100px] rounded-full -mr-32 -mt-32" />
                  <div className="flex justify-between items-center relative z-10">
                    <div className="flex flex-col">
                      <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest">Aggregate Value</span>
                      <span className="text-[36px] font-black text-white font-mono italic leading-none mt-2">₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-[12px] font-black text-emerald-400 uppercase tracking-widest">Total Received</span>
                      <span className="text-[36px] font-black text-emerald-300 font-mono italic leading-none mt-2">₹{totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                  <div className="h-px bg-slate-800 relative z-10" />
                  <div className="flex justify-between items-center relative z-10">
                    <div className="flex flex-col">
                      <span className="text-[12px] font-black text-rose-400 uppercase tracking-widest">Pending Balance</span>
                      <span className="text-[28px] font-black text-white font-mono italic leading-none mt-1">₹{balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Default Deposit Bank</label>
                    <select
                      value={formData.bankAccountId || ''}
                      onChange={(e) => {
                        const id = e.target.value ? Number(e.target.value) : null;
                        const b = bankAccounts.find(x => String(x.id) === String(id));
                        setFormData({ ...formData, bankAccountId: id, bankName: b?.bankName || '', accountNumber: b?.accountNumber || '' });
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-bold outline-none focus:border-indigo-500 transition-all appearance-none"
                    >
                      <option value="">Select account...</option>
                      {bankAccounts.map(b => (
                        <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber}</option>
                      ))}
                    </select>
                    {errors.bankAccountId && <p className="text-[10px] text-rose-500 font-bold uppercase mt-1.5">{errors.bankAccountId}</p>}
                  </div>

                  <div className="pt-6 border-t border-slate-100">
                    <div className="flex items-center gap-2 mb-4">
                      <input
                        type="checkbox"
                        id="advance"
                        checked={formData.initialDepositEnabled}
                        onChange={(e) => setFormData({ ...formData, initialDepositEnabled: e.target.checked })}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <label htmlFor="advance" className="text-[11px] font-black text-slate-700 uppercase tracking-widest">Record Advance Payment</label>
                    </div>

                    {formData.initialDepositEnabled && (
                      <div className="grid grid-cols-2 gap-4 p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100 animate-in slide-in-from-top-2">
                        <div>
                          <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Advance Amount</label>
                          <input type="number" value={formData.initialDepositAmount} onChange={(e) => setFormData({ ...formData, initialDepositAmount: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-bold" />
                        </div>
                        <div>
                          <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Target Bank</label>
                          <select
                            value={formData.initialDepositBankId || ''}
                            onChange={(e) => {
                              const id = e.target.value ? Number(e.target.value) : null;
                              const b = bankAccounts.find(x => String(x.id) === String(id));
                              setFormData({ ...formData, initialDepositBankId: id, initialDepositBankName: b ? `${b.bankName} - ${b.accountNumber}` : '' });
                            }}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-bold"
                          >
                            <option value="">Select bank...</option>
                            {bankAccounts.map(b => (
                              <option key={b.id} value={b.id}>{b.bankName}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-6 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-[14px] font-black text-slate-900 uppercase tracking-widest">Payment Installments</h4>
                      <button
                        type="button"
                        onClick={() => setFormData({
                          ...formData,
                          extraInstallments: [...(formData.extraInstallments || []), { date: new Date().toISOString().split('T')[0], amount: '', bankAccountId: '', notes: '' }]
                        })}
                        className="px-5 py-2.5 bg-emerald-50 text-emerald-600 rounded-xl text-[12px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all shadow-sm flex items-center gap-2 border border-emerald-100 group"
                      >
                        <Plus size={16} className="group-hover:rotate-90 transition-transform" />
                        <span>Add Installment</span>
                      </button>
                    </div>

                    <div className="space-y-6">
                      {(formData.extraInstallments || []).map((inst, idx) => (
                        <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-6 relative group animate-in slide-in-from-top-2">
                          <div className="grid grid-cols-2 gap-6">
                            <div>
                              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Payment Date</label>
                              <input
                                type="date"
                                value={inst.date}
                                onChange={(e) => updateInstallment(idx, 'date', e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-bold outline-none focus:border-indigo-500 transition-all"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Amount Paid (₹)</label>
                              <input
                                type="number"
                                value={inst.amount}
                                onChange={(e) => updateInstallment(idx, 'amount', e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-black italic outline-none focus:border-indigo-500 transition-all"
                                placeholder="0.00"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Deposit Target</label>
                              <select
                                value={inst.bankAccountId || ''}
                                onChange={(e) => {
                                  const id = e.target.value ? Number(e.target.value) : null;
                                  const b = bankAccounts.find(x => String(x.id) === String(id));
                                  updateInstallment(idx, 'bankAccountId', id);
                                  updateInstallment(idx, 'bankName', b ? b.bankName : '');
                                }}
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-bold outline-none focus:border-indigo-500 transition-all appearance-none"
                              >
                                <option value="">Select Account Registry...</option>
                                {bankAccounts.map(b => (
                                  <option key={b.id} value={b.id}>{b.bankName}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Transaction Ref</label>
                              <input
                                type="text"
                                value={inst.notes}
                                onChange={(e) => updateInstallment(idx, 'notes', e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-bold outline-none focus:border-indigo-500 transition-all"
                                placeholder="UPI, Cheque, Transfer Ref..."
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const next = [...formData.extraInstallments];
                              next.splice(idx, 1);
                              setFormData({ ...formData, extraInstallments: next });
                            }}
                            className="absolute -top-3 -right-3 h-10 w-10 bg-white text-rose-500 rounded-xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 shadow-xl border border-slate-100"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}

                      {(formData.extraInstallments || []).length === 0 && (
                        <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/50">
                          <Receipt size={40} className="mx-auto text-slate-200 mb-4" />
                          <p className="text-[13px] font-bold text-slate-400 uppercase tracking-widest">No installment records found</p>
                          <p className="text-[11px] text-slate-300 uppercase tracking-wider mt-1">Add payments to track outstanding balance</p>
                        </div>
                      )}
                    </div>
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

export default InvoiceForm;
