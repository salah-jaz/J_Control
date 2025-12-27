import { useEffect, useState } from "react";
import { Plus, Eye, Edit2, Trash2, X, Wallet, Building2, CreditCard, Search, Upload, Image } from "lucide-react";
import toast from "react-hot-toast";
import { getBankAccounts, createBankAccount, updateBankAccount, deleteBankAccount } from "../services/bankAccountService";
import clsx from "clsx";

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
  currency: "INR",
  status: "Active",
  openingDate: "",

  notes: "",
  qrCodeFile: null,
};

const tabs = ["Basic Info", "Bank Details", "Balance & Status", "QR Code", "Notes"];

export default function BankAccounts() {
  const [data, setData] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
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
    setOpenForm(true);
  };

  const openEdit = (item) => {
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
    if (!validate()) return;
    try {
      if (editId) {
        await updateBankAccount(editId, form);
        toast.success("Bank account updated successfully");
      } else {
        await createBankAccount(form);
        toast.success("Bank account added successfully");
      }
      await loadData();
      setOpenForm(false);
    } catch (e) {
      console.error("Failed to save", e);
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
    <div className="p-6 lg:p-10 w-full mx-auto animate-fade-in space-y-8 overflow-hidden">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Bank Accounts</h1>
          <p className="text-slate-500 mt-1 text-lg">Manage your banking and payment channels.</p>
        </div>
        <button
          onClick={openAdd}
          className="btn-primary flex items-center gap-2 shadow-lg shadow-brand-500/30"
        >
          <Plus size={20} />
          Add Account
        </button>
      </div>

      {/* TABLE */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="font-bold text-slate-800">Accounts</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search accounts..."
              className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 w-64 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50/50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Bank</th>
                <th className="px-6 py-4">Account Holder</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-slate-400 italic">
                    No bank accounts found
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
                          <p className="text-slate-500 text-xs font-mono">{item.accountNumber}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">{item.accountName}</td>
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
                        <button
                          onClick={() => openViewModal(item)}
                          title="View"
                          className="p-2 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => openEdit(item)}
                          title="Edit"
                          className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => deleteBankaccounts(item.id)}
                          title="Delete"
                          className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
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
              <div className="col-span-1 sm:col-span-2 flex items-center gap-4 p-4 bg-brand-50 rounded-xl border border-brand-100 mb-2">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-brand-600 shadow-sm shrink-0">
                  <CreditCard size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-brand-600 uppercase tracking-wide">Current Balance</p>
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

      {/* FORM MODAL */}
      {openForm && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-slide-up overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  {editId ? "Edit Bank Account" : "Add Bank Account"}
                </h2>
                <p className="text-sm text-slate-500 mt-1">Configure your bank or payment details.</p>
              </div>
              <button onClick={() => setOpenForm(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-gray-100 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>

            {/* TABS */}
            <div className="flex px-6 border-b border-gray-100 bg-gray-50/30 overflow-x-auto hide-scrollbar flex-shrink-0">
              {tabs.map((t, i) => (
                <button
                  key={i}
                  onClick={() => setActiveTab(i)}
                  className={clsx(
                    "px-6 py-4 text-sm font-bold uppercase tracking-wide border-b-2 transition-all whitespace-nowrap",
                    activeTab === i ? "border-brand-600 text-brand-600" : "border-transparent text-slate-500 hover:text-slate-800 hover:border-gray-200"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* TAB CONTENT */}
            <div className="flex-1 overflow-y-auto p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {activeTab === 0 && (
                  <>
                    <div>
                      <label className="label">
                        Bank Name
                        <Req />
                      </label>
                      {input("bankName")}
                    </div>
                    <div>
                      <label className="label">
                        Account Holder Name
                        <Req />
                      </label>
                      {input("accountName")}
                    </div>
                    <div>
                      <label className="label">Nick Name</label>
                      {input("nickName")}
                    </div>
                    <div>
                      <label className="label">
                        Account Type
                      </label>
                      <select
                        className="input"
                        value={form.accountType}
                        onChange={(e) =>
                          setForm({ ...form, accountType: e.target.value })
                        }
                      >
                        <option>Savings</option>
                        <option>Current</option>
                        <option>Overdraft</option>
                        <option>Loan</option>
                      </select>
                    </div>
                  </>
                )}

                {activeTab === 1 && (
                  <>
                    <div>
                      <label className="label">
                        Account Number
                        <Req />
                      </label>
                      {input("accountNumber")}
                    </div>
                    <div>
                      <label className="label">
                        IFSC Code
                        <Req />
                      </label>
                      {input("ifsc")}
                    </div>
                    <div><label className="label">Branch</label>{input("branch")}</div>
                    <div><label className="label">MICR Code</label>{input("micr")}</div>
                    <div><label className="label">SWIFT Code</label>{input("swift")}</div>
                  </>
                )}

                {activeTab === 2 && (
                  <>
                    <div>
                      <label className="label">
                        Opening Balance
                      </label>
                      {input("openingBalance", "number")}
                    </div>
                    <div><label className="label">Currency</label>{input("currency")}</div>
                    <div>
                      <label className="label">
                        Status
                      </label>
                      <select
                        className="input"
                        value={form.status}
                        onChange={(e) =>
                          setForm({ ...form, status: e.target.value })
                        }
                      >
                        <option>Active</option>
                        <option>Inactive</option>
                      </select>
                    </div>
                    <div><label className="label">Opening Date</label>{input("openingDate", "date")}</div>
                  </>
                )}

                {activeTab === 3 && (
                  <div className="md:col-span-2">
                    <label className="label">Start QR Code Upload</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 transition cursor-pointer relative flex flex-col items-center justify-center min-h-[300px]">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      {qrPreview ? (
                        <div className="relative">
                          <img src={qrPreview} alt="QR Preview" className="max-h-64 object-contain rounded-lg border border-gray-200 shadow-sm" />
                          <p className="mt-4 text-sm text-green-600 font-bold bg-green-50 px-3 py-1 rounded-full inline-block">Image Selected</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                            <Upload size={32} />
                          </div>
                          <p className="text-lg font-bold text-slate-700">Click to upload QR Code</p>
                          <p className="text-sm mt-1">PNG, JPG up to 5MB</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 4 && (
                  <div className="md:col-span-2">
                    <textarea
                      className="input h-32 w-full"
                      placeholder="Internal notes about this account..."
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-white flex-shrink-0">
              <button onClick={() => setOpenForm(false)} className="btn-secondary">Cancel</button>
              <button
                onClick={saveAccount}
                className="btn-primary"
              >
                Save Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
