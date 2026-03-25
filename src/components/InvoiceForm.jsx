import { useState, useEffect } from 'react';
import { 
  Plus, Trash2, X, User, Layers, Landmark, Wallet, FileText, 
  Building2, Calendar as CalendarIcon, Clock, Target, MessageSquare, 
  Save, CheckCircle2, AlertTriangle, CreditCard, Banknote, FileCheck, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { createInvoice, updateInvoice } from '../services/invoiceService';
import { getClients } from '../services/db';
import { getBankAccounts } from '../services/bankAccountService';

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

const InvoiceForm = ({
  isOpen,
  onClose,
  onSave,
  invoice,
  nextInvoiceNumber,
  nextInvoiceNumberLoading,
}) => {
  console.log('InvoiceForm render:', nextInvoiceNumber);
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
      const [cResult, b] = await Promise.all([getClients({ per_page: 100 }), getBankAccounts()]);
      const c = cResult?.data ?? cResult;
      setClients(Array.isArray(c) ? c : []);
      setBankAccounts(b);
    };
    if (isOpen) load();
  }, [isOpen]);

  const getBankDisplay = (id) => {
    if (id == null) return '';
    const numId = typeof id === 'number' ? id : Number(id);
    const b = bankAccounts.find((x) => x.id === numId || x.id === id || String(x.id) === String(id));
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
        operationalExpenses: (invoice.operational_expenses || []).map((o) => {
          const bankId = o.bank_account_id ?? o.bankAccountId ?? null;
          const bankIdNum = bankId != null && bankId !== '' ? Number(bankId) : null;
          const resolvedBankId = bankIdNum != null && !Number.isNaN(bankIdNum) ? bankIdNum : bankId;
          const displayName = getBankDisplay(resolvedBankId) || o.bank_name || o.bankName || '';
          return {
            name: o.name || '',
            amount: o.amount != null ? String(o.amount) : '',
            bankAccountId: resolvedBankId,
            bankName: displayName,
            paid: o.paid === true || o.paid === '1' || o.paid === 'Paid',
          };
        }),
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
    (formData.operationalExpenses || []).forEach((row, idx) => {
      if (row.paid && (parseFloat(row.amount) || 0) > 0 && !row.bankAccountId) {
        e[`operationalExpenseBank_${idx}`] = 'Select bank for paid expense';
      }
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
    (formData.operationalExpenses || []).forEach((row, i) => {
      data.append(`operational_expenses[${i}][name]`, row.name || '');
      data.append(`operational_expenses[${i}][amount]`, row.amount || '');
      data.append(`operational_expenses[${i}][bank_account_id]`, row.bankAccountId || '');
      data.append(`operational_expenses[${i}][paid]`, row.paid ? '1' : '0');
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-[4px] animate-in fade-in duration-[250ms]">
      <div className="bg-white/90 backdrop-blur-xl w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-[0.98] duration-[250ms] border border-white/40 overflow-hidden">
        
        {/* Header */}
        <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-white z-20">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-gradient-to-br from-brand-600 to-brand-400 text-white rounded-xl flex items-center justify-center shadow-[0_4px_12px_rgba(234,88,12,0.3)] animate-pulse-subtle">
              <FileCheck className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-[20px] font-bold text-slate-900 tracking-tight">
                {invoice ? "Revise Financial Instrument" : "Issue New Invoice/Bill"}
              </h3>
              <p className="text-[12px] font-medium text-slate-500 mt-0.5">
                {invoice ? `Modifying ${invoice.invoice_number}` : "Generate professional billing documents for clients"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="h-10 w-10 bg-slate-50 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all flex items-center justify-center active:scale-95 shadow-sm border border-slate-100">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="w-64 border-r border-slate-100 bg-slate-50/50 p-4 flex flex-col gap-2">
            {[
              { id: 'basic', label: 'Billing Context', icon: User, desc: 'Client & Temporal' },
              { id: 'services', label: 'Service Inventory', icon: Layers, desc: 'Items & Valuation' },
              { id: 'finance', label: 'Fiscal Architecture', icon: Wallet, desc: 'Payments & Expenses' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={clsx(
                  "flex items-center gap-3 p-3.5 rounded-xl transition-all duration-[250ms] group text-left relative overflow-hidden",
                  activeTab === t.id 
                    ? "bg-white text-brand-600 shadow-md shadow-brand-500/5 ring-1 ring-slate-200" 
                    : "text-slate-500 hover:bg-white hover:text-slate-900"
                )}
              >
                {activeTab === t.id && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-600 rounded-full" />
                )}
                <t.icon className={clsx("h-5 w-5 transition-transform duration-300", activeTab === t.id && "scale-110")} />
                <div>
                  <p className="text-[14px] font-bold leading-none">{t.label}</p>
                  <p className="text-[10px] font-medium opacity-60 mt-1 uppercase tracking-wider">{t.desc}</p>
                </div>
              </button>
            ))}

            {/* Live Summary Stats */}
            <div className="mt-auto bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-5 text-white shadow-lg space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-4 w-4 text-brand-400" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-brand-200">Live Valuation</span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-[13px]">
                   <span className="opacity-60">Subtotal</span>
                   <span className="font-medium">₹{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-[16px]">
                   <span className="font-bold">Total Due</span>
                   <span className="font-black text-brand-400">₹{totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white">
            <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl mx-auto">
              {activeTab === 'basic' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                  <SectionHeader icon={Building2} title="Entity Configuration" color="blue" />
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <Label text="Invoice Identifier" />
                      <div className="input-premium bg-slate-50 text-slate-500 border-dashed flex items-center">
                        {invoice ? invoice.invoice_number : (nextInvoiceNumberLoading ? 'Synchronizing...' : (nextInvoiceNumber || 'Draft'))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label text="Client Relationship" required />
                      <select
                        value={formData.clientId}
                        onChange={(e) => {
                          const c = clients.find((x) => String(x.id) === String(e.target.value));
                          setFormData({ ...formData, clientId: e.target.value, clientName: c ? (c.company_name || c.client_name) : '' });
                        }}
                        className={clsx("input-premium", errors.clientId && "border-rose-400 ring-rose-100")}
                      >
                        <option value="">Select Target Entity</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>{c.company_name || c.client_name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <Label text="Document Issuance Date" />
                      <div className="relative">
                        <CalendarIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="input-premium pl-10" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label text="Financial Status" />
                      <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="input-premium">
                        <option value="Pending">Pending Audit</option>
                        <option value="Paid">Cleared/Capitalized</option>
                        <option value="Overdue">Past Maturity</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-4">
                    <SectionHeader icon={Landmark} title="Banking Architecture" color="indigo" />
                    <Label text="Primary Disbursement Account" required />
                    <select
                      value={formData.bankAccountId || ''}
                      onChange={(e) => {
                        const id = e.target.value ? Number(e.target.value) : null;
                        const b = bankAccounts.find((x) => x.id === id);
                        setFormData({ ...formData, bankAccountId: id, bankName: b ? b.bankName : '', accountNumber: b ? b.accountNumber : '' });
                      }}
                      className={clsx("input-premium", errors.bankAccountId && "border-rose-400 ring-rose-100")}
                    >
                      <option value="">Select Treasury Channel</option>
                      {bankAccounts.map((b) => (
                        <option key={b.id} value={b.id}>{b.bankName} – {b.accountNumber}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {activeTab === 'services' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                  <SectionHeader icon={Layers} title="Service Inventory Mapping" color="violet" />
                  <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm bg-white">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                          <th className="px-6 py-4 text-left w-12 italic">#</th>
                          <th className="px-6 py-4 text-left">Deliverable Name</th>
                          <th className="px-6 py-4 text-right w-40">Valuation (₹)</th>
                          <th className="px-6 py-4 w-12"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {items.map((item, index) => (
                          <tr key={index} className="group hover:bg-slate-50/30 transition-colors">
                            <td className="px-6 py-4 text-slate-400 font-bold">{item.sNo}</td>
                            <td className="px-6 py-4">
                              <input
                                type="text"
                                className="w-full bg-transparent font-medium border-none focus:ring-0 p-0 placeholder:text-slate-300"
                                placeholder="Service execution detail..."
                                value={item.serviceName}
                                onChange={(e) => handleItemChange(index, 'serviceName', e.target.value)}
                              />
                            </td>
                            <td className="px-6 py-4">
                              <input
                                type="number"
                                className="w-full bg-transparent text-right font-bold border-none focus:ring-0 p-0 placeholder:text-slate-300 text-slate-700"
                                placeholder="0.00"
                                value={item.amount}
                                onChange={(e) => handleItemChange(index, 'amount', e.target.value)}
                              />
                            </td>
                            <td className="px-6 py-4">
                              {items.length > 1 && (
                                <button type="button" onClick={() => removeItem(index)} className="h-8 w-8 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg flex items-center justify-center transition-all opacity-0 group-hover:opacity-100">
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button type="button" onClick={addItem} className="flex items-center gap-2 text-[13px] font-bold text-brand-600 hover:text-brand-700 bg-brand-50/50 px-4 py-2 rounded-xl transition-all border border-brand-100/50 active:scale-95">
                    <Plus size={16} /> Append Line Item
                  </button>

                  <div className="grid grid-cols-2 gap-8 pt-6">
                    <div className="space-y-6">
                       <SectionHeader icon={Target} title="Deductions & Levies" color="fuchsia" />
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label text="Protocol" />
                            <select value={formData.discountType} onChange={(e) => setFormData({ ...formData, discountType: e.target.value })} className="input-premium">
                              <option value="Flat">Flat Value</option>
                              <option value="Percentage">Relativity (%)</option>
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <Label text="Delta" />
                            <input type="number" className="input-premium" placeholder="0.00" value={formData.discountValue} onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })} />
                          </div>
                       </div>
                       <div className="space-y-1.5">
                          <Label text="Fiscal Duty (GST %)" />
                          <input type="number" value={formData.gst} onChange={(e) => setFormData({ ...formData, gst: e.target.value })} className="input-premium" />
                       </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'finance' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                  <SectionHeader icon={Wallet} title="Capital Allocation" color="rose" />
                  <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl space-y-4">
                    <div className="grid grid-cols-2 gap-6 pb-4 border-b border-white/10 opacity-70">
                       <div className="flex justify-between items-center text-[14px]">
                          <span>Gross Subtotal</span>
                          <span className="font-bold font-mono">₹{subtotal.toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between items-center text-[14px]">
                          <span>Unified Tax</span>
                          <span className="font-bold font-mono">₹{taxAmount.toLocaleString()}</span>
                       </div>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                       <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-brand-500/20 text-brand-400 rounded-lg flex items-center justify-center">
                             <Banknote className="h-5 w-5" />
                          </div>
                          <div>
                             <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Aggregate Liability</p>
                             <h4 className="text-[24px] font-black text-brand-400 font-mono">₹{totalAmount.toLocaleString()}</h4>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Unsettled Stake</p>
                          <h4 className="text-[20px] font-extrabold text-rose-400 font-mono">₹{balanceDue.toLocaleString()}</h4>
                       </div>
                    </div>
                  </div>

                  <div className="space-y-6 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-3 p-4 bg-slate-50/80 rounded-2xl border border-slate-100 hover:border-brand-100 transition-all cursor-pointer group" onClick={() => setFormData({...formData, initialDepositEnabled: !formData.initialDepositEnabled})}>
                      <div className={clsx("h-6 w-6 rounded-md border-2 flex items-center justify-center transition-all", formData.initialDepositEnabled ? "bg-brand-600 border-brand-600" : "bg-white border-slate-200")}>
                        {formData.initialDepositEnabled && <CheckCircle2 className="h-4 w-4 text-white" />}
                      </div>
                      <span className="text-[14px] font-bold text-slate-700">Initial Capital Injection (Deposit)</span>
                    </div>

                    {formData.initialDepositEnabled && (
                      <div className="grid grid-cols-2 gap-6 animate-in slide-in-from-top-2 duration-300 ml-9 pb-4">
                        <div className="space-y-1.5">
                           <Label text="Injection Quantum (₹)" />
                           <input type="number" className="input-premium" placeholder="0.00" value={formData.initialDepositAmount} onChange={(e) => setForm({...formData, initialDepositAmount: e.target.value})} />
                        </div>
                        <div className="space-y-1.5">
                           <Label text="Target Vault" />
                           <button type="button" onClick={() => { setBankModalFor('initial'); setBankModalOpen(true); }} className={clsx("input-premium text-left relative", errors.initialDepositBank && "border-rose-400")}>
                             {formData.initialDepositBankName || getBankDisplay(formData.initialDepositBankId) || 'Select Reserve Entity'}
                             <Landmark className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                           </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <SectionHeader icon={Activity} title="Operational Expenditures" color="amber" />
                  <div className="space-y-3">
                    {formData.operationalExpenses?.map((row, idx) => (
                      <div key={idx} className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 grid grid-cols-12 gap-4 items-center animate-in slide-in-from-right-2 duration-200">
                         <div className="col-span-4">
                            <input type="text" className="bg-transparent border-none focus:ring-0 p-0 text-[14px] font-bold placeholder:text-slate-300" placeholder="Expense nomenclature..." value={row.name} onChange={(e) => {
                               const next = [...formData.operationalExpenses];
                               next[idx].name = e.target.value;
                               setFormData({...formData, operationalExpenses: next});
                            }} />
                         </div>
                         <div className="col-span-3">
                            <input type="number" className="bg-transparent border-none focus:ring-0 p-0 text-[14px] font-black text-slate-700 text-right w-full" placeholder="0.00" value={row.amount} onChange={(e) => {
                               const next = [...formData.operationalExpenses];
                               next[idx].amount = e.target.value;
                               setFormData({...formData, operationalExpenses: next});
                            }} />
                         </div>
                         <div className="col-span-3 text-right">
                           <select className="bg-transparent border-none text-[12px] font-bold text-slate-500 focus:ring-0 p-0 text-right cursor-pointer" value={row.paid ? 'Paid' : 'Unpaid'} onChange={(e) => {
                              const next = [...formData.operationalExpenses];
                              next[idx].paid = e.target.value === 'Paid';
                              setFormData({...formData, operationalExpenses: next});
                           }}>
                              <option value="Unpaid">UNSETTLED</option>
                              <option value="Paid">CAPITALIZED</option>
                           </select>
                         </div>
                         <div className="col-span-2 flex justify-end">
                            <button type="button" onClick={() => setFormData({...formData, operationalExpenses: formData.operationalExpenses.filter((_, i) => i !== idx)})} className="h-8 w-8 text-rose-400 hover:bg-rose-50 rounded-lg flex items-center justify-center">
                               <X size={14} />
                            </button>
                         </div>
                      </div>
                    ))}
                    <button type="button" onClick={() => setFormData({...formData, operationalExpenses: [...(formData.operationalExpenses || []), { name: '', amount: '', bankAccountId: null, bankName: '', paid: false }]})} className="text-[12px] font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1.5 pl-2 transition-colors">
                      <Plus size={14} /> Append Expenditure Field
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-slate-100 flex justify-between items-center bg-slate-50/50 z-20">
          <button onClick={onClose} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-[14px] font-medium hover:border-slate-300 hover:bg-slate-50 transition-all shadow-sm active:scale-95">
            Discard Parameters
          </button>
          <div className="flex gap-4">
             <button
               type="button"
               disabled={!isSavedRecord}
               className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-[14px] font-medium hover:border-slate-300 flex items-center gap-2 transition-all shadow-sm active:scale-95 disabled:opacity-50"
             >
                <Eye size={16} /> Preview Draft
             </button>
             <button
                type="submit"
                onClick={handleSubmit}
                className="px-8 py-2.5 bg-gradient-to-r from-brand-600 to-brand-400 text-white rounded-xl text-[14px] font-medium shadow-lg shadow-brand-500/20 hover:shadow-xl hover:shadow-brand-500/30 transition-all hover:-translate-y-[2px] active:scale-95 group relative overflow-hidden"
             >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                <div className="flex items-center gap-2 relative z-10">
                   <Save size={18} className="stroke-[2.5]" />
                   <span>{invoice ? 'Synchronize Updates' : 'Authorize Issuance'}</span>
                </div>
             </button>
          </div>
        </div>

        {/* Local Nested Modal for Bank Selection */}
        {bankModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-in zoom-in-[0.95] duration-200">
              <div className="px-6 py-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-[16px] font-bold text-slate-800">Assign Financial Channel</h3>
                <button onClick={() => setBankModalOpen(false)} className="h-8 w-8 text-slate-400 hover:text-rose-500 transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {bankAccounts.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      const name = `${b.bankName} – ${b.accountNumber}`;
                      if (bankModalFor === 'initial') {
                        setFormData((prev) => ({ ...prev, initialDepositBankId: b.id, initialDepositBankName: name }));
                      } else if (bankModalFor?.type === 'installment' || bankModalFor?.type === 'operationalExpense') {
                         const field = bankModalFor.type === 'installment' ? 'extraInstallments' : 'operationalExpenses';
                         const next = [...formData[field]];
                         next[bankModalFor.index].bankAccountId = b.id;
                         next[bankModalFor.index].bankName = name;
                         setFormData({...formData, [field]: next});
                      }
                      setBankModalOpen(false);
                    }}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-100 hover:border-brand-200 hover:bg-brand-50/50 text-left transition-all group"
                  >
                    <div className="h-10 w-10 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center group-hover:bg-brand-100 group-hover:text-brand-600 transition-colors">
                       <Landmark size={20} />
                    </div>
                    <div>
                       <p className="text-[14px] font-bold text-slate-800 tracking-tight">{b.bankName}</p>
                       <p className="text-[12px] font-medium text-slate-400">Acc: {b.accountNumber}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceForm;
