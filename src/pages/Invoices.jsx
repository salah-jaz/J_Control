import { useState, useEffect, useRef } from 'react';
import { Plus, Search, Trash2, Edit2, Eye, X, User, Layers, Landmark, Wallet, FileText, AlertCircle, TrendingUp, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { useLocation } from 'react-router-dom';
import { getNextInvoiceNumber, getInvoiceSummary, getInvoices, createInvoice, updateInvoice, deleteInvoice } from '../services/invoiceService';
import { getClients } from '../services/db';
import { getBankAccounts } from '../services/bankAccountService';
import InvoiceView from '../components/InvoiceViewer';

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
};

const InvoiceForm = ({ isOpen, onClose, onSave, invoice, nextInvoiceNumber }) => {
  const [clients, setClients] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState(emptyForm);
  const [items, setItems] = useState([{ sNo: 1, serviceName: '', paymentStatus: 'Pending', amount: '' }]);
  const [errors, setErrors] = useState({});
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [bankModalFor, setBankModalFor] = useState(null);
  const [savedExtraInstallmentsCount, setSavedExtraInstallmentsCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      const [c, b] = await Promise.all([getClients(), getBankAccounts()]);
      setClients(c);
      setBankAccounts(b);
    };
    if (isOpen) load();
  }, [isOpen]);

  const getBankDisplay = (id) => {
    const b = bankAccounts.find((x) => x.id === id);
    return b ? `${b.bankName} – ${b.accountNumber}` : '';
  };

  useEffect(() => {
    if (invoice && isOpen) {
      const extra = (invoice.extra_installments || []).map((i) => ({
        date: i.date || '',
        amount: i.amount != null ? String(i.amount) : '',
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
      });
      const invItems = invoice.items || [];
      setItems(
        invItems.length
          ? invItems.map((it, idx) => ({
              sNo: idx + 1,
              serviceName: it.service_name || '',
              paymentStatus: it.payment_status || 'Pending',
              amount: it.amount != null ? String(it.amount) : '',
            }))
          : [{ sNo: 1, serviceName: '', paymentStatus: 'Pending', amount: '' }]
      );
      setSavedExtraInstallmentsCount(extra.length);
    } else if (!invoice && isOpen) {
      setFormData(emptyForm);
      setItems([{ sNo: 1, serviceName: '', paymentStatus: 'Pending', amount: '' }]);
      setSavedExtraInstallmentsCount(0);
    }
    setActiveTab('basic');
    setErrors({});
  }, [invoice, isOpen, bankAccounts]);

  const subtotal = items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const gstPct = parseFloat(formData.gst) || 0;
  const taxAmount = subtotal * (gstPct / 100);
  const discountVal =
    formData.discountType === 'Percentage'
      ? subtotal * ((parseFloat(formData.discountValue) || 0) / 100)
      : parseFloat(formData.discountValue) || 0;
  const totalAmount = Math.max(0, subtotal - discountVal + taxAmount);
  const initialDeposit = formData.initialDepositEnabled ? parseFloat(formData.initialDepositAmount) || 0 : 0;
  const sumInstallments = (formData.extraInstallments || []).reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const balanceDue = Math.max(0, totalAmount - initialDeposit - sumInstallments);
  const isSavedRecord = !!invoice?.id;

  const addItem = () => {
    setItems((prev) => [...prev, { sNo: prev.length + 1, serviceName: '', paymentStatus: 'Pending', amount: '' }]);
  };
  const removeItem = (idx) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== idx).map((it, i) => ({ ...it, sNo: i + 1 })));
  };
  const handleItemChange = (idx, field, value) => {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const validate = () => {
    const e = {};
    if (!formData.clientId) e.clientId = 'Client is required';
    if (!formData.bankAccountId) e.bankAccountId = 'Bank Account is required';
    if (items.some((i) => !(i.serviceName && i.amount))) e.items = 'All service rows must have name and amount';
    if (formData.initialDepositEnabled && (parseFloat(formData.initialDepositAmount) || 0) > 0 && !formData.initialDepositBankId) {
      e.initialDepositBank = 'Select bank for initial deposit';
    }
    (formData.extraInstallments || []).forEach((row, idx) => {
      if ((parseFloat(row.amount) || 0) > 0 && !row.bankAccountId) e[`installmentBank_${idx}`] = 'Select bank for payment';
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      toast.error(Object.values(errors)[0] || 'Please fix the form');
      return;
    }
    const client = clients.find((c) => c.id == formData.clientId);
    const data = new FormData();
    if (invoice?.id) data.append('id', invoice.id);
    data.append('client_id', formData.clientId);
    data.append('client_name', client ? (client.company_name || client.client_name) : formData.clientName);
    data.append('date', formData.date);
    data.append('status', formData.status);
    data.append('gst', formData.gst);
    data.append('discount_type', formData.discountType);
    data.append('discount', formData.discountValue);
    data.append('bank_account_id', formData.bankAccountId);
    data.append('gpay_number', formData.gpayNumber);
    data.append('initial_deposit_enabled', formData.initialDepositEnabled ? '1' : '0');
    data.append('initial_deposit_amount', formData.initialDepositAmount);
    data.append('initial_deposit_bank_id', formData.initialDepositBankId || '');
    (formData.extraInstallments || []).forEach((row, i) => {
      data.append(`extra_installments[${i}][date]`, row.date || '');
      data.append(`extra_installments[${i}][amount]`, row.amount || '');
      data.append(`extra_installments[${i}][bank_account_id]`, row.bankAccountId || '');
      data.append(`extra_installments[${i}][notes]`, row.notes || '');
    });

    items.forEach((item, index) => {
      data.append(`items[${index}][service_name]`, item.serviceName);
      data.append(`items[${index}][payment_status]`, item.paymentStatus);
      data.append(`items[${index}][amount]`, item.amount);
    });

    try {
      if (invoice?.id) {
        data.append('_method', 'PUT');
        await updateInvoice(invoice.id, data);
        toast.success('Invoice updated');
      } else {
        await createInvoice(data);
        toast.success('Invoice created');
      }
      onSave();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save invoice');
    }
  };

  if (!isOpen) return null;

  const inputClass = (f) => `input ${errors[f] ? 'border-red-500' : ''}`;
  const Req = () => <span className="text-red-500 ml-1 font-bold">*</span>;

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden animate-slide-up">
        <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight">
              {invoice ? 'Edit Invoice' : 'Create New Invoice'}
            </h2>
            <p className="text-xs md:text-sm text-slate-500 mt-1">Fill in the details below.</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex px-4 md:px-6 border-b border-gray-100 bg-gray-50/30 overflow-x-auto">
          {[
            { id: 'basic', label: 'Basic Info', icon: User },
            { id: 'services', label: 'Service Details', icon: Layers },
            { id: 'finance', label: 'Finance', icon: Wallet },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={clsx(
                'px-4 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2',
                activeTab === id ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              )}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeTab === 'basic' && (
              <>
                <div>
                  <label className="label">Invoice ID</label>
                  <div className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-slate-600 font-medium">
                    {invoice?.invoice_number || invoice?.id ? (invoice.invoice_number || `INV-${invoice.id}`) : (nextInvoiceNumber || '—')}
                  </div>
                </div>
                <div>
                  <label className="label">Client <Req /></label>
                  <select
                    value={formData.clientId}
                    onChange={(e) => {
                      const c = clients.find((x) => x.id == e.target.value);
                      setFormData({ ...formData, clientId: e.target.value, clientName: c ? (c.company_name || c.client_name) : '' });
                    }}
                    className={inputClass('clientId')}
                  >
                    <option value="">Select client</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.company_name || c.client_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Date</label>
                  <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="input" />
                </div>
                <div>
                  <label className="label">Status</label>
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="input">
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="label">Bank Account <Req /></label>
                  <select
                    value={formData.bankAccountId || ''}
                    onChange={(e) => {
                      const id = e.target.value ? Number(e.target.value) : null;
                      const b = bankAccounts.find((x) => x.id === id);
                      setFormData({
                        ...formData,
                        bankAccountId: id,
                        bankName: b ? b.bankName : '',
                        accountNumber: b ? b.accountNumber : '',
                      });
                    }}
                    className={inputClass('bankAccountId')}
                  >
                    <option value="">Select bank account</option>
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>{b.bankName} – {b.accountNumber}</option>
                    ))}
                  </select>
                  {formData.accountNumber && (
                    <p className="text-sm text-slate-500 mt-1">Account Number: {formData.accountNumber}</p>
                  )}
                </div>
              </>
            )}

            {activeTab === 'services' && (
              <>
                <div className="md:col-span-2">
                  <div className="overflow-x-auto border border-gray-200 rounded-xl">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                        <tr>
                          <th className="px-4 py-3 w-12 text-center">#</th>
                          <th className="px-4 py-3">Service Name</th>
                          <th className="px-4 py-3 w-28">Amount (₹)</th>
                          <th className="px-4 py-3 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {items.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-center text-slate-500">{item.sNo}</td>
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                className="input"
                                placeholder="e.g. Website Development"
                                value={item.serviceName}
                                onChange={(e) => handleItemChange(index, 'serviceName', e.target.value)}
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                step="0.01"
                                className="input"
                                placeholder="0.00"
                                value={item.amount}
                                onChange={(e) => handleItemChange(index, 'amount', e.target.value)}
                              />
                            </td>
                            <td className="px-4 py-2">
                              {items.length > 1 && (
                                <button type="button" onClick={() => removeItem(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button type="button" onClick={addItem} className="mt-3 flex items-center gap-2 text-brand-600 font-bold hover:text-brand-700">
                    <Plus className="w-4 h-4" /> Add Service
                  </button>

                  <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h4 className="text-sm font-bold text-slate-800 mb-4">Discount & Tax</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="label">Discount Type</label>
                        <select
                          value={formData.discountType}
                          onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                          className="input"
                        >
                          <option value="Flat">Flat (₹)</option>
                          <option value="Percentage">Percentage (%)</option>
                        </select>
                      </div>
                      <div>
                        <label className="label">Discount Value</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="input"
                          placeholder={formData.discountType === 'Flat' ? '0.00' : '0'}
                          value={formData.discountValue}
                          onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                        />
                        {subtotal > 0 && formData.discountValue && (
                          <p className="text-xs text-slate-500 mt-1">
                            {formData.discountType === 'Flat'
                              ? `Percentage: ${((parseFloat(formData.discountValue) / subtotal) * 100).toFixed(1)}%`
                              : `Flat: ₹${(subtotal * (parseFloat(formData.discountValue) || 0) / 100).toFixed(2)}`}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="label">GST %</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={formData.gst}
                          onChange={(e) => setFormData({ ...formData, gst: e.target.value })}
                          className="input"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'finance' && (
              <div className="md:col-span-2 space-y-6">
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h3 className="text-base font-bold text-slate-800 mb-4">Financial Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Subtotal (₹)</label>
                      <input type="text" readOnly className="input bg-gray-50" value={`₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} />
                    </div>
                    <div>
                      <label className="label">Discount (₹)</label>
                      <input type="text" readOnly className="input bg-gray-50" value={`₹${discountVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} />
                    </div>
                    <div>
                      <label className="label">Tax (₹)</label>
                      <input type="text" readOnly className="input bg-gray-50" value={`₹${taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} />
                    </div>
                    <div>
                      <label className="label">Total Amount (₹)</label>
                      <input type="text" readOnly className="input bg-brand-50 font-bold" value={`₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} />
                    </div>
                  </div>
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 mb-4">
                      <input
                        type="checkbox"
                        id="initialDeposit"
                        checked={formData.initialDepositEnabled}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            initialDepositEnabled: e.target.checked,
                            initialDepositAmount: e.target.checked ? formData.initialDepositAmount : '',
                            initialDepositBankId: e.target.checked ? formData.initialDepositBankId : null,
                          })
                        }
                        className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                      />
                      <label htmlFor="initialDeposit" className="text-sm font-medium text-slate-700">Initial Deposit</label>
                    </div>
                    {formData.initialDepositEnabled && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="label">Initial Deposit Amount (₹)</label>
                          <input
                            type="number"
                            step="0.01"
                            className="input"
                            placeholder="0.00"
                            value={formData.initialDepositAmount}
                            onChange={(e) => setFormData({ ...formData, initialDepositAmount: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="label">Bank Account</label>
                          <button
                            type="button"
                            onClick={() => { setBankModalFor('initial'); setBankModalOpen(true); }}
                            className={clsx('input w-full text-left', errors.initialDepositBank && 'border-red-500')}
                          >
                            {formData.initialDepositBankName || getBankDisplay(formData.initialDepositBankId) || 'Select Bank'}
                          </button>
                          {errors.initialDepositBank && <p className="text-sm text-red-500 mt-1">{errors.initialDepositBank}</p>}
                        </div>
                      </div>
                    )}
                    <div className="mt-4">
                      <label className="label">Balance Due (₹)</label>
                      <input type="text" readOnly className="input bg-amber-50 font-bold" value={`₹${balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-bold text-slate-800">Extra Installments (Split Payments)</h3>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          extraInstallments: [...(formData.extraInstallments || []), { date: '', amount: '', bankAccountId: null, bankName: '', notes: '' }],
                        })
                      }
                      className="btn-primary flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Add Payment
                    </button>
                  </div>
                  <div className="space-y-4">
                    {(formData.extraInstallments || []).length === 0 ? (
                      <p className="text-sm text-slate-400 py-4 text-center">No payments. Click &quot;+ Add Payment&quot; to add.</p>
                    ) : (
                      (formData.extraInstallments || []).map((row, idx) => {
                        const rowIsSaved = isSavedRecord && idx < savedExtraInstallmentsCount;
                        return (
                          <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 rounded-xl border border-gray-100 bg-gray-50/50 items-end">
                            <div className="md:col-span-2">
                              <label className="label text-xs">Date</label>
                              <input
                                type="date"
                                readOnly={rowIsSaved}
                                className="input"
                                value={row.date}
                                onChange={(e) => {
                                  const next = [...(formData.extraInstallments || [])];
                                  next[idx] = { ...next[idx], date: e.target.value };
                                  setFormData({ ...formData, extraInstallments: next });
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
                                  const next = [...(formData.extraInstallments || [])];
                                  next[idx] = { ...next[idx], amount: e.target.value };
                                  setFormData({ ...formData, extraInstallments: next });
                                }}
                              />
                            </div>
                            <div className="md:col-span-3">
                              <label className="label text-xs">Bank Account</label>
                              <button
                                type="button"
                                disabled={rowIsSaved}
                                onClick={() => { setBankModalFor({ type: 'installment', index: idx }); setBankModalOpen(true); }}
                                className={clsx('input w-full text-left truncate bg-white', errors[`installmentBank_${idx}`] && 'border-red-500')}
                              >
                                {row.bankName || getBankDisplay(row.bankAccountId) || 'Select Bank'}
                              </button>
                              {errors[`installmentBank_${idx}`] && <p className="text-sm text-red-500 mt-1">{errors[`installmentBank_${idx}`]}</p>}
                            </div>
                            <div className="md:col-span-3">
                              <label className="label text-xs">Notes</label>
                              <input
                                type="text"
                                readOnly={rowIsSaved}
                                className="input"
                                placeholder="Optional"
                                value={row.notes}
                                onChange={(e) => {
                                  const next = [...(formData.extraInstallments || [])];
                                  next[idx] = { ...next[idx], notes: e.target.value };
                                  setFormData({ ...formData, extraInstallments: next });
                                }}
                              />
                            </div>
                            <div className="md:col-span-2 flex justify-end">
                              {!rowIsSaved && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setFormData({
                                      ...formData,
                                      extraInstallments: (formData.extraInstallments || []).filter((_, i) => i !== idx),
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
          </div>

          {bankModalOpen && (
            <div className="absolute inset-0 bg-slate-900/60 z-10 flex items-center justify-center p-4 rounded-2xl">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="text-lg font-bold text-slate-800">Select Bank Account</h3>
                  <button type="button" onClick={() => { setBankModalOpen(false); setBankModalFor(null); }} className="p-2 text-slate-400 hover:text-slate-600 rounded-full">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="overflow-y-auto p-4 space-y-2">
                  {bankAccounts.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        const name = `${b.bankName} – ${b.accountNumber}`;
                        if (bankModalFor === 'initial') {
                          setFormData((prev) => ({ ...prev, initialDepositBankId: b.id, initialDepositBankName: name }));
                          setErrors((prev) => ({ ...prev, initialDepositBank: undefined }));
                        } else if (bankModalFor?.type === 'installment' && typeof bankModalFor.index === 'number') {
                          const next = [...(formData.extraInstallments || [])];
                          next[bankModalFor.index] = { ...next[bankModalFor.index], bankAccountId: b.id, bankName: name };
                          setFormData((prev) => ({ ...prev, extraInstallments: next }));
                          setErrors((prev) => ({ ...prev, [`installmentBank_${bankModalFor.index}`]: undefined }));
                        }
                        setBankModalOpen(false);
                        setBankModalFor(null);
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-brand-200 hover:bg-brand-50/50 text-left"
                    >
                      <Landmark className="w-5 h-5 text-brand-600" />
                      <span className="font-medium text-slate-800">{b.bankName} – {b.accountNumber}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary shadow-lg shadow-brand-500/30">
              {invoice ? 'Save Changes' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

function isDateInRange(dateStr, range) {
  if (!dateStr || range === 'All') return true;
  const d = new Date(dateStr);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  if (range === 'Today') return d >= todayStart && d < new Date(todayStart.getTime() + 86400000);
  if (range === 'This Week') return d >= weekStart;
  if (range === 'This Month') return d >= monthStart;
  if (range === 'This Year') return d >= yearStart;
  return true;
}

const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className="card hover:border-brand-200/50 group h-36 flex flex-col justify-between p-6">
    <div className="flex justify-between items-start">
      <div className={`p-3.5 rounded-xl ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="text-right">
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <h3 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">{value}</h3>
      </div>
    </div>
    <div className="w-full bg-gray-100 h-1.5 rounded-full mt-4 overflow-hidden">
      <div className={`h-full rounded-full ${color} opacity-30`} style={{ width: '70%' }} />
    </div>
  </div>
);

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [invoiceSummary, setInvoiceSummary] = useState(null);
  const [clients, setClients] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All');
  const location = useLocation();

  useEffect(() => {
    if (location.state?.openForm) {
      setEditingInvoice(null);
      setIsFormOpen(true);
    }
    if (location.state?.initialStatus) setStatusFilter(location.state.initialStatus);
    window.history.replaceState({}, document.title);
  }, [location]);

  const loadData = async () => {
    try {
      const [list, summary, clientsData] = await Promise.all([getInvoices(), getInvoiceSummary(), getClients()]);
      setInvoices(Array.isArray(list) ? list : []);
      setInvoiceSummary(summary);
      setClients(clientsData || []);
    } catch (e) {
      console.error('Failed to load invoices', e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (isFormOpen && !editingInvoice) {
      getNextInvoiceNumber().then(setNextInvoiceNumber).catch(() => setNextInvoiceNumber(''));
    }
  }, [isFormOpen, editingInvoice]);

  const filteredInvoices = invoices.filter((inv) => {
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      const match =
        (inv.invoice_number && inv.invoice_number.toLowerCase().includes(q)) ||
        (inv.client_name && inv.client_name.toLowerCase().includes(q)) ||
        (String(inv.id).includes(q));
      if (!match) return false;
    }
    if (clientFilter) {
      const invClientName = inv.client_name || inv.clientName;
      const matchName = clients.find((c) => (c.company_name || c.client_name) === clientFilter);
      const nameMatch = invClientName === clientFilter || (matchName && inv.client_id == matchName.id);
      if (!nameMatch) return false;
    }
    if (statusFilter !== 'All' && inv.status !== statusFilter) return false;
    if (!isDateInRange(inv.date, dateFilter)) return false;
    return true;
  });

  const handleSave = async () => {
    await loadData();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this invoice? Linked income/transactions will be removed.')) return;
    try {
      await deleteInvoice(id);
      toast.success('Invoice deleted');
      loadData();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete');
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto animate-fade-in space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Invoices</h1>
          <p className="text-slate-500 mt-1 text-base md:text-lg">Manage billing and payments.</p>
        </div>
        <button
          onClick={() => {
            setEditingInvoice(null);
            setIsFormOpen(true);
          }}
          className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2 shadow-lg shadow-brand-500/30"
        >
          <Plus size={20} /> New Invoice
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <StatCard
          title="Total Invoices"
          value={invoiceSummary != null ? String(invoiceSummary.totalInvoices ?? 0) : '—'}
          icon={FileText}
          color="bg-slate-600"
        />
        <StatCard
          title="Paid Invoices"
          value={invoiceSummary != null ? String(invoiceSummary.paidInvoices ?? 0) : '—'}
          icon={Receipt}
          color="bg-emerald-600"
        />
        <StatCard
          title="Pending / Overdue"
          value={invoiceSummary != null ? String((invoiceSummary.pendingInvoices ?? 0) + (invoiceSummary.overdueInvoices ?? 0)) : '—'}
          icon={AlertCircle}
          color="bg-amber-600"
        />
        <StatCard
          title="Total Revenue"
          value={invoiceSummary != null ? `₹${Number(invoiceSummary.totalRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
          icon={TrendingUp}
          color="bg-blue-600"
        />
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search invoice..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 w-full"
            />
          </div>
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="flex-1 lg:flex-none px-4 py-2 bg-white border border-gray-100 rounded-xl text-sm font-medium text-slate-600 outline-none focus:border-brand-500 min-w-[160px]"
          >
            <option value="">All Clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.company_name || c.client_name}>{c.company_name || c.client_name}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 lg:flex-none px-4 py-2 bg-white border border-gray-100 rounded-xl text-sm font-medium text-slate-600 outline-none focus:border-brand-500 min-w-[120px]"
          >
            <option value="All">All</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Overdue">Overdue</option>
          </select>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="flex-1 lg:flex-none px-4 py-2 bg-white border border-gray-100 rounded-xl text-sm font-medium text-slate-600 outline-none focus:border-brand-500 min-w-[120px]"
          >
            <option value="All">All Time</option>
            <option value="Today">Today</option>
            <option value="This Week">This Week</option>
            <option value="This Month">This Month</option>
            <option value="This Year">This Year</option>
          </select>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-4 md:px-6 md:py-5 border-b border-gray-100 flex flex-col lg:flex-row justify-between items-start lg:items-center bg-gray-50/50 gap-4">
          <h3 className="font-bold text-slate-800">Invoice History</h3>
          <span className="text-xs font-semibold text-slate-500 bg-gray-100 px-2 py-1 rounded-lg">
            Showing {filteredInvoices.length} of {invoices.length}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left min-w-[700px]">
            <thead className="bg-gray-50/50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Invoice ID</th>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Grand Total</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 font-mono font-bold text-slate-800">{inv.invoice_number || `#${inv.id}`}</td>
                  <td className="px-6 py-4 font-medium text-slate-900">{inv.client_name || inv.clientName || '—'}</td>
                  <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                    {typeof inv.date === 'string' ? inv.date.split('T')[0] : (inv.date || '—')}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-slate-900">
                    ₹{parseFloat(inv.grand_total ?? inv.amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={clsx(
                        'badge',
                        inv.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          inv.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-rose-50 text-rose-700 border-rose-100'
                      )}
                    >
                      <span
                        className={clsx(
                          'w-1.5 h-1.5 rounded-full mr-1.5 inline-block',
                          inv.status === 'Paid' ? 'bg-emerald-500' : inv.status === 'Pending' ? 'bg-amber-500' : 'bg-rose-500'
                        )}
                      />
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setViewingInvoice(inv)}
                        className="p-2 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                        title="View"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => { setEditingInvoice(inv); setIsFormOpen(true); }}
                        className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(inv.id)}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500 italic">
                    No invoices found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <InvoiceForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSave}
        invoice={editingInvoice}
        nextInvoiceNumber={nextInvoiceNumber}
      />

      {viewingInvoice && (
        <InvoiceView
          isOpen={!!viewingInvoice}
          onClose={() => setViewingInvoice(null)}
          invoice={viewingInvoice}
        />
      )}
    </div>
  );
}
