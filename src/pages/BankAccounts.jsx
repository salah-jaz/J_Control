import { useEffect, useState } from "react";
import { Plus, Eye, Edit2, Trash2, X, Wallet, Building2, CreditCard, Upload, Image, Loader2, FileText, MapPin } from "lucide-react";
import toast from "react-hot-toast";
import { getBankAccounts, createBankAccount, updateBankAccount, deleteBankAccount } from "../services/bankAccountService";
import { invalidateCache } from "../utils/apiFetch";
import clsx from "clsx";
import PageHeader from "../components/ui/PageHeader";
import ToolbarSearch from "../components/ui/ToolbarSearch";
import EmptyState from "../components/ui/EmptyState";
import { TableSectionHeader } from "../components/ui/DataTableSection";
import { ActionIconButton } from "../components/ui/TableRowActions";
import SlideOver from "../components/ui/SlideOver";

const emptyForm = {
  bankName: "",
  accountName: "",
  nickName: "",
  accountType: "Savings",

  accountNumber: "",
  ifsc: "",
  branch: "",
  micr: "",
  swift: "",

  openingBalance: "",
  currentBalance: "", // Add currentBalance to emptyForm
  currency: "INR",
  status: "Active",
  openingDate: "",

  notes: "",
  qrCodeFile: null,
};

const tabs = [
  { label: "Basic Info", desc: "Owner and type", icon: Building2 },
  { label: "Bank Details", desc: "Account identifiers", icon: CreditCard },
  { label: "Balance", desc: "Amounts and status", icon: Wallet },
  { label: "QR Code", desc: "Payment scan", icon: Image },
  { label: "Notes", desc: "Internal notes", icon: Edit2 },
];

export default function BankAccounts() {
  const [data, setData] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [editId, setEditId] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [qrPreview, setQrPreview] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const records = await getBankAccounts();
      setData(records);
    } catch (e) {
      console.error("Failed to load bank accounts", e);
    }
  };

  const openAdd = () => {
    setForm(emptyForm);
    setErrors({});
    setEditId(null);
    setQrPreview(null);
    setActiveTab(0);
    setIsSaving(false);
    setOpenForm(true);
  };

  const openEdit = (item) => {
    setIsSaving(false);
    setForm(item);
    setEditId(item.id);
    setErrors({});
    setActiveTab(0);

    if (item.qrCode) {
      const API_BASE_URL = 'http://localhost:8000';
      setQrPreview(item.qrCode.startsWith('http') ? item.qrCode : `${API_BASE_URL}/storage/${item.qrCode}`);
    } else {
      setQrPreview(null);
    }

    setOpenForm(true);
  };

  const openViewModal = (item) => {
    setViewItem(item);
    setOpenView(true);
  };

  /* DELETE */
  const deleteBankaccounts = async (id) => {
    if (!window.confirm("Delete this bank account?")) return;
    try {
      await deleteBankAccount(id);
      toast.success("Bank account deleted successfully");
      loadData();
    } catch (e) {
      console.error("Failed to delete", e);
      toast.error("Failed to delete");
    }
  };

  const validate = () => {
    const e = {};
    if (!form.bankName) e.bankName = "Bank Name is required";
    if (!form.accountName) e.accountName = "Account Name is required";
    if (!form.accountNumber) e.accountNumber = "Account Number is required";
    if (!form.ifsc) e.ifsc = "IFSC Code is required";

    if (Object.keys(e).length > 0) {
      setErrors(e);
      const firstError = Object.values(e)[0];
      toast.error(Object.keys(e).length > 1 ? `Please fix validation errors. ${firstError}` : firstError);
      return false;
    }
    return true;
  };

  const saveAccount = async () => {
    if (isSaving) return;
    if (!validate()) return;
    setIsSaving(true);
    try {
      if (editId) {
        await updateBankAccount(editId, form);
        toast.success("Bank account updated successfully");
      } else {
        const newAccount = await createBankAccount(form);
        toast.success("Bank account added successfully");
        setData((prev) => [newAccount, ...prev]);
      }
      invalidateCache("/bank-accounts");
      await loadData();
      setOpenForm(false);
    } catch (e) {
      console.error("Failed to save", e);
      setIsSaving(false);
      if (e.response && e.response.data && e.response.data.errors) {
        setErrors(e.response.data.errors);
        toast.error("Validation failed. Please check the form.");
      } else {
        toast.error("Failed to save");
      }
    }
  };

  const input = (name, type = "text") => (
    <input
      type={type}
      value={form[name]}
      onChange={(e) => setForm({ ...form, [name]: e.target.value })}
      className={`input ${errors[name] ? "border-red-500 focus:border-red-500 focus:ring-red-200" : ""}`}
    />
  );

  const Req = () => <span className="text-red-500 ml-1 font-bold">*</span>;

  const filteredData = data.filter((item) =>
    Object.values(item).some(
      (val) =>
        val &&
        val.toString().toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setForm({ ...form, qrCodeFile: file });
      setQrPreview(URL.createObjectURL(file));
    }
  };

  return (
    <div className="p-4 md:p-8 animate-fade-in space-y-8 overflow-hidden">
      {/* HEADER */}
      <PageHeader
        title="Bank Accounts"
        subtitle="Manage your banking and payment channels."
        primaryAction={(
          <button
            onClick={openAdd}
            className="btn-primary flex items-center gap-2 shadow-lg shadow-violet-500/30"
          >
            <Plus size={20} />
            Add Account
          </button>
        )}
      />

      {/* TABLE */}
      <div className="card p-0 overflow-hidden">
        <div className="p-4 md:p-5 border-b border-gray-100 bg-gray-50/50 space-y-3">
          <TableSectionHeader title="Accounts" summary={`Showing ${filteredData.length}`} />
          <ToolbarSearch
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={setSearchQuery}
            className="max-w-sm"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50/80 text-[13px] font-semibold text-slate-600 capitalize tracking-normal border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Bank</th>
                <th className="px-6 py-4">Account Holder</th>
                <th className="px-6 py-4">Account Number</th>
                <th className="px-6 py-4">Current Balance</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-2">
                    <EmptyState
                      icon={Wallet}
                      title="No bank accounts found"
                      description="Add a bank account or adjust your search."
                    />
                  </td>
                </tr>
              ) : (
                filteredData.map((item, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                          <Building2 size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{item.bankName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">{item.accountName}</td>
                    <td className="px-6 py-4 font-mono text-slate-600">{item.accountNumber}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {item.currency} {parseFloat(item.currentBalance || item.openingBalance || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{item.accountType}</td>
                    <td className="px-6 py-4">
                      <span
                        className={clsx(
                          "px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide border",
                          item.status === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-700 border-red-100"
                        )}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <ActionIconButton onClick={() => openViewModal(item)} title="View" icon={Eye} tone="view" />
                        <ActionIconButton onClick={() => openEdit(item)} title="Edit" icon={Edit2} tone="edit" />
                        <ActionIconButton onClick={() => deleteBankaccounts(item.id)} title="Delete" icon={Trash2} tone="delete" />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VIEW MODAL */}
      {openView && viewItem && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white max-w-xl w-full rounded-2xl shadow-2xl animate-slide-up overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Account Details</h2>
              <button onClick={() => setOpenView(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-gray-100 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6 overflow-y-auto max-h-[80vh]">
              <div className="col-span-1 sm:col-span-2 flex items-center gap-4 p-4 bg-brand-50 rounded-xl border border-violet-100 mb-2">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-violet-600 shadow-sm shrink-0">
                  <CreditCard size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-violet-600 uppercase tracking-wide">Current Balance</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {viewItem.currency} {parseFloat(viewItem.currentBalance || viewItem.openingBalance || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              {Object.entries(viewItem).filter(([k]) => !['id', 'created_at', 'updated_at', 'currency', 'openingBalance', 'currentBalance'].includes(k)).map(([k, v]) => (
                <div key={k} className="flex flex-col">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">
                    {k.replace(/([A-Z])/g, ' $1').trim()}
                  </p>
                  <p className="text-sm font-medium text-slate-800 break-words">{v || <span className="text-slate-400 italic">None</span>}</p>
                </div>
              ))}

              {viewItem.qrCode && (
                <div className="col-span-1 sm:col-span-2 mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">QR Code</p>
                  <div className="w-48 h-48 border border-gray-200 rounded-xl p-2 bg-white shadow-sm flex items-center justify-center">
                    <img
                      src={viewItem.qrCode.startsWith('http') ? viewItem.qrCode : `http://localhost:8000/storage/${viewItem.qrCode}`}
                      alt="QR Code"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex justify-end">
              <button onClick={() => setOpenView(false)} className="btn-secondary">Close Details</button>
            </div>
          </div>
        </div>
      )}

      {/* FORM SLIDEOVER */}
      <SlideOver
        isOpen={openForm}
        onClose={() => setOpenForm(false)}
        size="5xl"
        title={editId ? "Edit Bank Account" : "New Bank Account"}
        footer={(
          <div className="flex justify-end gap-3 w-full px-1">
            <button onClick={() => setOpenForm(false)} className="px-6 py-2.5 text-[14px] font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-all">Cancel</button>
            <button
              onClick={saveAccount}
              disabled={isSaving}
              className="px-10 py-2.5 bg-indigo-600 text-white text-[14px] font-black rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              <span>{isSaving ? 'Saving...' : (editId ? 'Save Changes' : 'Create Account')}</span>
            </button>
          </div>
        )}
      >
        <div className="flex h-full min-h-[600px] relative">
          {/* Sidebar Navigation */}
          <div className="w-64 border-r-2 border-slate-100 pr-6 shrink-0 hidden md:block">
            <div className="flex flex-col gap-2 sticky top-0">
              {tabs.map((tabItem, i) => (
                <div key={tabItem.label}>
                  <button
                    onClick={() => setActiveTab(i)}
                    className={clsx(
                      "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-[0.15em] transition-all relative group",
                      activeTab === i
                        ? "bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100 ring-1 ring-indigo-200/50"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    {activeTab === i && (
                      <div className="absolute -right-[26px] top-3 bottom-3 w-1 bg-indigo-600 rounded-l-full z-10" />
                    )}
                    <tabItem.icon className={clsx("h-4 w-4", activeTab === i ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600")} />
                    <span>{tabItem.label}</span>
                  </button>
                  {i < tabs.length - 1 && <div className="h-px bg-slate-50 mx-4 my-1 opacity-50" />}
                </div>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 pl-10 overflow-y-auto">
            <div className="pb-20">
              <div className="grid grid-cols-1 gap-8">
                {activeTab === 0 && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="grid grid-cols-2 gap-8">
                      <div className="col-span-2">
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Bank Name <Req /></label>
                        <div className="relative">
                          <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-11 py-3 text-[13px] font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm" placeholder="e.g. HDFC Bank Ltd" value={form.bankName} onChange={e => setForm({...form, bankName: e.target.value})} />
                        </div>
                        {errors.bankName && <p className="text-[10px] text-rose-500 mt-2 font-bold uppercase tracking-widest">{errors.bankName}</p>}
                      </div>
                      <div>
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Account Holder <Req /></label>
                        <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm" value={form.accountName} onChange={e => setForm({...form, accountName: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Reference No</label>
                        <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm" value={form.nickName} onChange={e => setForm({...form, nickName: e.target.value})} />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Account Type</label>
                        <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm appearance-none" value={form.accountType} onChange={e => setForm({...form, accountType: e.target.value})}>
                          <option>Savings</option>
                          <option>Current</option>
                          <option>Overdraft</option>
                          <option>Loan</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 1 && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="grid grid-cols-2 gap-8">
                      <div className="col-span-2">
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Account Number <Req /></label>
                        <div className="relative">
                          <CreditCard size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-11 py-3 text-[13px] font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm font-mono" value={form.accountNumber} onChange={e => setForm({...form, accountNumber: e.target.value})} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">IFSC Code <Req /></label>
                        <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm uppercase font-mono" value={form.ifsc} onChange={e => setForm({...form, ifsc: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Branch</label>
                        <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm" value={form.branch} onChange={e => setForm({...form, branch: e.target.value})} />
                      </div>
                      <div><label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">MICR Code</label><input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm" value={form.micr} onChange={e => setForm({...form, micr: e.target.value})} /></div>
                      <div><label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">SWIFT Code</label><input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm uppercase" value={form.swift} onChange={e => setForm({...form, swift: e.target.value})} /></div>
                    </div>
                  </div>
                )}

                {activeTab === 2 && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="bg-slate-900 rounded-3xl p-8 text-white space-y-6 relative overflow-hidden group shadow-2xl border border-slate-800">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 blur-[100px] rounded-full -mr-32 -mt-32 group-hover:bg-indigo-600/20 transition-colors" />
                      <div className="flex justify-between items-center relative z-10">
                        <h4 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.2em]">Balance Summary</h4>
                        <Wallet className="text-indigo-500" size={24} />
                      </div>
                      <div className="space-y-4 relative z-10">
                        <div className="flex justify-between items-end border-b border-slate-800 pb-4">
                          <span className="text-[11px] font-bold text-slate-400 uppercase">Opening Balance</span>
                          <span className="text-[18px] font-black font-mono tracking-tight italic">₹{parseFloat(form.openingBalance || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between items-end pt-4">
                          <span className="text-[13px] font-black text-white uppercase tracking-[0.3em]">Current Balance</span>
                          <span className="text-[32px] font-black font-mono tracking-tighter italic text-indigo-400 leading-none">₹{parseFloat(form.currentBalance || 0).toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                      <div>
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Opening Balance (₹)</label>
                        <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-black outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm italic" value={form.openingBalance} onChange={e => {
                          const val = e.target.value;
                          setForm(prev => {
                            const newer = { ...prev, openingBalance: val };
                            if (editId) {
                              const original = data.find(d => d.id === editId);
                              if (original) {
                                const diff = (parseFloat(val) || 0) - (parseFloat(original.openingBalance) || 0);
                                newer.currentBalance = ((parseFloat(original.currentBalance) || 0) + diff).toFixed(2);
                              }
                            } else {
                              newer.currentBalance = val;
                            }
                            return newer;
                          });
                        }} />
                      </div>
                      <div>
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Current Balance (₹)</label>
                        <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-black outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm italic" value={form.currentBalance} onChange={e => setForm({...form, currentBalance: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Currency</label>
                        <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm uppercase font-mono" value={form.currency} onChange={e => setForm({...form, currency: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Status</label>
                        <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm appearance-none" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                          <option>Active</option>
                          <option>Inactive</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Opening Date</label>
                        <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm" value={form.openingDate} onChange={e => setForm({...form, openingDate: e.target.value})} />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 3 && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="relative group overflow-hidden rounded-3xl border-2 border-dashed border-slate-200 hover:border-indigo-300 transition-all bg-slate-50 min-h-[400px] flex flex-col items-center justify-center p-8">
                      <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-20" />
                      {qrPreview ? (
                        <div className="relative z-10 flex flex-col items-center animate-in zoom-in-95 duration-300">
                          <div className="bg-white p-4 rounded-3xl shadow-2xl border border-slate-100 ring-8 ring-indigo-50/50">
                            <img src={qrPreview} alt="QR Preview" className="max-h-64 object-contain rounded-xl" />
                          </div>
                          <p className="mt-8 text-[12px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-6 py-2.5 rounded-xl border border-indigo-100 flex items-center gap-2">
                            <Plus size={14} className="rotate-45" /> Replace QR Code
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400 space-y-4">
                          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-slate-300 shadow-sm border border-slate-100 group-hover:scale-110 group-hover:text-indigo-400 transition-all">
                            <Upload size={32} />
                          </div>
                          <div className="text-center">
                            <p className="text-[16px] font-black text-slate-700 uppercase tracking-widest">Upload QR Code</p>
                            <p className="text-[11px] text-slate-400 mt-1 uppercase font-bold tracking-wider">Drag and drop or click to upload QR</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 4 && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div>
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Notes</label>
                      <textarea
                        className="w-full bg-slate-50 border border-slate-200 rounded-3xl p-8 text-[14px] font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm min-h-[300px] resize-none"
                        placeholder="Enter internal notes here..."
                        value={form.notes}
                        onChange={e => setForm({ ...form, notes: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </SlideOver>
    </div>
  );
}
