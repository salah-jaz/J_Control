import { useState, useEffect } from 'react';
import {
  Plus, Trash2, X, Landmark, Loader2, Save, FileText, Receipt,
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

const FieldGroup = ({ label, required, error, children }) => (
  <div className="space-y-1">
    <label className="text-[12px] font-bold text-slate-700 flex items-center gap-1">
      {label}
      {required && <span className="text-rose-500">*</span>}
    </label>
    {children}
    {error && <p className="text-[11px] text-rose-500 font-medium">{error}</p>}
  </div>
);

const inputCls = (err) => clsx(
  "w-full px-3 py-2 bg-white border rounded text-[13px] font-medium text-slate-800 placeholder:text-slate-400 outline-none transition-colors",
  err ? "border-rose-300 focus:border-rose-500" : "border-slate-200 focus:border-indigo-500"
);

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
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [bankModalFor, setBankModalFor] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [qrFile, setQrFile] = useState(null);
  const [qrPreview, setQrPreview] = useState(null);

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

  const updateExpense = (idx, field, val) => {
    const next = [...formData.operationalExpenses]; next[idx] = { ...next[idx], [field]: val };
    setFormData({ ...formData, operationalExpenses: next });
  };

  const updateInstallment = (idx, field, val) => {
    const next = [...(formData.extraInstallments || [])];
    next[idx] = { ...next[idx], [field]: val };
    setFormData({ ...formData, extraInstallments: next });
  };

  return (
    <SlideOver
      isOpen={isOpen}
      onClose={onClose}
      title={invoice ? 'Edit Invoice' : 'New Invoice'}
      footer={(
        <div className="flex items-center justify-between w-full">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Grand Total</span>
            <span className="text-lg font-bold text-slate-900 leading-none">₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-[13px] font-bold text-slate-600 hover:bg-slate-100 rounded transition-colors">Cancel</button>
            <button
              onClick={handleSubmit}
              disabled={isSaving}
              className="px-6 py-2 bg-indigo-600 text-white text-[13px] font-bold rounded hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isSaving ? 'Saving...' : 'Save Invoice'}
            </button>
          </div>
        </div>
      )}
    >
      <div className="space-y-6">
        {/* Step Navigation */}
        <div className="flex border-b border-slate-100 mb-6">
          {STEPS.map((step) => (
            <button
              key={step.id}
              onClick={() => setActiveTab(step.id)}
              className={clsx(
                "flex-1 py-3 text-[12px] font-bold uppercase tracking-wider transition-colors border-b-2",
                activeTab === step.id ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400 hover:text-slate-600"
              )}
            >
              {step.label}
            </button>
          ))}
        </div>

        {activeTab === 'basic' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <FieldGroup label="Client" required error={errors.clientId}>
              <SearchableSelect
                options={clients.map(c => ({ id: c.id, name: c.company_name || c.client_name }))}
                value={formData.clientId}
                onChange={(val) => {
                  const c = clients.find(x => String(x.id) === String(val));
                  setFormData({ ...formData, clientId: val, clientName: c ? (c.company_name || c.client_name) : '' });
                }}
                placeholder="Select a client..."
              />
            </FieldGroup>

            <div className="grid grid-cols-2 gap-4">
              <FieldGroup label="Invoice Date">
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className={inputCls()}
                />
              </FieldGroup>
              <FieldGroup label="Status">
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className={inputCls()}
                >
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                  <option value="Overdue">Overdue</option>
                  <option value="Draft">Draft</option>
                </select>
              </FieldGroup>
            </div>
          </div>
        )}

        {activeTab === 'services' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="space-y-2">
              <label className="text-[12px] font-bold text-slate-700">Line Items</label>
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <div className="flex-1">
                    <SearchableSelect
                      options={products}
                      value={item.serviceName}
                      onChange={(val) => updateItem(idx, 'serviceName', val)}
                      placeholder="Service name..."
                    />
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      placeholder="Amount"
                      value={item.amount}
                      onChange={(e) => updateItem(idx, 'amount', e.target.value)}
                      className={inputCls()}
                    />
                  </div>
                  {items.length > 1 && (
                    <button onClick={() => removeItem(idx)} className="p-2 text-slate-400 hover:text-rose-500 rounded hover:bg-rose-50">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={addItem} className="text-[12px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 mt-2">
                <Plus size={14} /> Add Item
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-md space-y-2 border border-slate-100">
              <div className="flex justify-between text-[13px]">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-bold text-slate-700">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <FieldGroup label="GST (%)">
                  <input type="number" value={formData.gst} onChange={(e) => setFormData({ ...formData, gst: e.target.value })} className={inputCls()} />
                </FieldGroup>
                <FieldGroup label="Discount">
                  <div className="flex gap-1">
                    <select value={formData.discountType} onChange={(e) => setFormData({ ...formData, discountType: e.target.value })} className={clsx(inputCls(), "w-16 px-1")}>
                      <option value="Flat">₹</option>
                      <option value="Percentage">%</option>
                    </select>
                    <input type="number" value={formData.discountValue} onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })} className={inputCls()} />
                  </div>
                </FieldGroup>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'bank' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <FieldGroup label="Bank Account" required error={errors.bankAccountId}>
              <select
                value={formData.bankAccountId || ''}
                onChange={(e) => {
                  const id = e.target.value ? Number(e.target.value) : null;
                  const b = bankAccounts.find(x => String(x.id) === String(id));
                  setFormData({ ...formData, bankAccountId: id, bankName: b?.bankName || '', accountNumber: b?.accountNumber || '' });
                }}
                className={inputCls(errors.bankAccountId)}
              >
                <option value="">Select account...</option>
                {bankAccounts.map(b => (
                  <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber}</option>
                ))}
              </select>
            </FieldGroup>

            <FieldGroup label="UPI / GPay (Optional)">
              <input type="text" value={formData.gpayNumber} onChange={(e) => setFormData({ ...formData, gpayNumber: e.target.value })} placeholder="UPI ID or Number" className={inputCls()} />
            </FieldGroup>

            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  id="advance"
                  checked={formData.initialDepositEnabled}
                  onChange={(e) => setFormData({ ...formData, initialDepositEnabled: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="advance" className="text-[13px] font-bold text-slate-700">Client paid an advance</label>
              </div>

              {formData.initialDepositEnabled && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-indigo-50/50 rounded border border-indigo-100">
                  <FieldGroup label="Advance Amount">
                    <input type="number" value={formData.initialDepositAmount} onChange={(e) => setFormData({ ...formData, initialDepositAmount: e.target.value })} className={inputCls()} />
                  </FieldGroup>
                  <FieldGroup label="Received In">
                    <select
                      value={formData.initialDepositBankId || ''}
                      onChange={(e) => {
                        const id = e.target.value ? Number(e.target.value) : null;
                        const b = bankAccounts.find(x => String(x.id) === String(id));
                        setFormData({ ...formData, initialDepositBankId: id, initialDepositBankName: b ? `${b.bankName} - ${b.accountNumber}` : '' });
                      }}
                      className={inputCls()}
                    >
                      <option value="">Select bank...</option>
                      {bankAccounts.map(b => (
                        <option key={b.id} value={b.id}>{b.bankName}</option>
                      ))}
                    </select>
                  </FieldGroup>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bank Modal (if still needed for complex flows, but simplified here) */}
      {bankModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded shadow-xl w-full max-w-sm overflow-hidden p-6">
            <h3 className="font-bold text-slate-800 mb-4">Select Bank Account</h3>
            <div className="space-y-2">
              {bankAccounts.map(b => (
                <button
                  key={b.id}
                  onClick={() => {
                    const name = `${b.bankName} - ${b.accountNumber}`;
                    if (bankModalFor === 'initial') {
                      setFormData(p => ({ ...p, initialDepositBankId: b.id, initialDepositBankName: name }));
                    } else if (bankModalFor?.startsWith('installment-')) {
                      const idx = parseInt(bankModalFor.split('-')[1]);
                      const next = [...formData.extraInstallments];
                      next[idx] = { ...next[idx], bankAccountId: b.id, bankName: name };
                      setFormData(p => ({ ...p, extraInstallments: next }));
                    }
                    setBankModalOpen(false);
                  }}
                  className="w-full p-3 text-left border border-slate-100 rounded hover:bg-slate-50 transition-colors"
                >
                  <p className="font-bold text-[13px]">{b.bankName}</p>
                  <p className="text-[11px] text-slate-400 font-mono">{b.accountNumber}</p>
                </button>
              ))}
            </div>
            <button onClick={() => setBankModalOpen(false)} className="w-full mt-4 py-2 text-[13px] font-bold text-slate-400">Cancel</button>
          </div>
        </div>
      )}
    </SlideOver>
  );
};

export default InvoiceForm;
