import { useEffect, useState } from "react";
import { Eye, Edit2, Trash2, Plus, Download, Search, X } from "lucide-react";
import toast from "react-hot-toast";
import { getExpenses, createExpense, updateExpense, deleteExpense } from "../services/expenseService";
import { getBankAccounts } from "../services/bankAccountService";
import clsx from "clsx";

const emptyForm = {
  vendor: "",
  expenseType: "",
  project: "",
  category: "",
  billNo: "",
  amount: "",
  currency: "INR",

  method: "",
  transactionId: "",
  bank: "",
  paidDate: "",
  status: "Paid",

  gstApplied: "No",
  gstPercent: "18",
  gstAmount: "",
  netAmount: "",
  vendorGstin: "",
  itcEligible: "No",

  staff: "",
  department: "",
  notes: "",
};

export default function Expenses() {
  const [data, setData] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [tab, setTab] = useState("basic");

  const [openForm, setOpenForm] = useState(false);
  const [openView, setOpenView] = useState(false);

  const [editId, setEditId] = useState(null);
  const [viewItem, setViewItem] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const records = await getExpenses();
      setData(records);
      const banks = await getBankAccounts();
      setBankAccounts(banks);
    } catch (e) {
      console.error("Failed to load expenses", e);
    }
  };

  /* AUTO GST CALCULATION */
  useEffect(() => {
    const base = parseFloat(form.amount) || 0;
    if (form.gstApplied === "Yes") {
      const percent = parseFloat(form.gstPercent) || 0;
      const gst = (base * percent) / 100;
      setForm((p) => ({
        ...p,
        gstAmount: gst.toFixed(2),
        netAmount: (base + gst).toFixed(2),
      }));
    } else {
      setForm((p) => ({
        ...p,
        gstAmount: "0.00",
        netAmount: base.toFixed(2),
      }));
    }
  }, [form.amount, form.gstApplied, form.gstPercent]);

  const openAdd = () => {
    setForm(emptyForm);
    setErrors({});
    setEditId(null);
    setTab("basic");
    setOpenForm(true);
  };

  const openEdit = (item) => {
    setForm(item);
    setErrors({});
    setEditId(item.id);
    setTab("basic");
    setOpenForm(true);
  };

  const openViewModal = (item) => {
    setViewItem(item);
    setOpenView(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this expense record?")) return;
    try {
      await deleteExpense(id);
      toast.success("Expense record deleted successfully");
      loadData();
    } catch (e) {
      toast.error("Failed to delete record");
    }
  };

  const validate = () => {
    const e = {};
    if (!form.vendor) e.vendor = "Vendor is required";
    if (!form.expenseType) e.expenseType = "Expense type is required";
    if (!form.amount) e.amount = "Amount is required";
    if (!form.method) e.method = "Payment method is required";
    if (!form.paidDate) e.paidDate = "Paid date is required";
    if (form.method !== "Cash" && !form.transactionId) {
      e.transactionId = "Transaction ID is required for non-cash payments";
    }

    if (Object.keys(e).length > 0) {
      setErrors(e);
      const firstError = Object.values(e)[0];
      toast.error(Object.keys(e).length > 1 ? `Please fix validation errors. ${firstError}` : firstError);
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    try {
      if (editId) {
        await updateExpense(editId, form);
        toast.success("Expense updated successfully");
      } else {
        await createExpense(form);
        toast.success("Expense added successfully");
      }
      await loadData();
      setOpenForm(false);
    } catch (e) {
      console.error("Failed to save", e);
      if (e.response && e.response.data && e.response.data.errors) {
        setErrors(e.response.data.errors);
        toast.error("Validation failed. Please check the form.");
      } else {
        toast.error("Failed to save record: " + (e.message || "Unknown error"));
      }
    }
  };

  const inputClass = (f) =>
    `input ${errors[f] ? "border-red-500 focus:border-red-500 focus:ring-red-200" : ""}`;
  const Req = () => <span className="text-red-500 ml-1 font-bold">*</span>;

  return (
    <div className="p-4 md:p-6 lg:p-8 w-full mx-auto animate-fade-in space-y-6 md:space-y-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Expense Tracking</h1>
          <p className="text-slate-500 mt-1 text-lg">Monitor and control your business spending.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={openAdd}
            className="btn-primary flex items-center gap-2 shadow-lg shadow-brand-500/30"
          >
            <Plus size={20} />
            Add Expense
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-4 md:px-6 md:py-5 border-b border-gray-100 flex flex-col sm:row justify-between items-start sm:items-center gap-4 bg-gray-50/50">
          <h3 className="font-bold text-slate-800">Recent Expenses</h3>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input type="text" placeholder="Search..." className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 w-full transition-all" />
            </div>
            <button className="hidden sm:flex p-2 bg-white border border-gray-200 rounded-lg text-slate-500 hover:bg-gray-50 transition-colors">
              <Download size={18} />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm text-left min-w-[800px]">
            <thead className="bg-gray-50/50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Vendor</th>
                <th className="px-6 py-4">Expense Type</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4">Method</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500 italic">
                    No expense records found
                  </td>
                </tr>
              ) : (
                data.map((item, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 font-medium text-slate-900">{item.vendor}</td>
                    <td className="px-6 py-4 text-slate-600">{item.expenseType}</td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900 font-mono">
                      ₹{parseFloat(item.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-gray-100 border border-gray-200 rounded-lg text-xs font-semibold text-slate-600">
                        {item.method}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-mono text-xs">{item.paidDate}</td>
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
                          onClick={() => handleDelete(item.id)}
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
          <div className="bg-white max-w-2xl w-full rounded-2xl shadow-2xl animate-slide-up overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Expense Details</h2>
              <button onClick={() => setOpenView(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-gray-100 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 overflow-y-auto max-h-[60vh]">
              {Object.entries(viewItem).map(([k, v]) => (
                <div key={k} className="flex flex-col">
                  <p className="text-xs font-bold text-brand-600 uppercase tracking-wider mb-1">
                    {k.replace(/([A-Z])/g, ' $1').trim()}
                  </p>
                  <p className="font-medium text-slate-800 break-words">{v || <span className="text-slate-400 italic">None</span>}</p>
                </div>
              ))}
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
                  {editId ? "Edit Expense" : "New Expense Entry"}
                </h2>
                <p className="text-sm text-slate-500 mt-1">Record the details of this expenditure.</p>
              </div>
              <button onClick={() => setOpenForm(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-gray-100 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>

            {/* TABS */}
            <div className="flex px-6 border-b border-gray-100 bg-gray-50/30 overflow-x-auto hide-scrollbar flex-shrink-0">
              {["basic", "payment", "tax", "internal"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={clsx(
                    "px-6 py-4 text-sm font-bold uppercase tracking-wide border-b-2 transition-all whitespace-nowrap",
                    tab === t ? "border-brand-600 text-brand-600" : "border-transparent text-slate-500 hover:text-slate-800 hover:border-gray-200"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* TAB CONTENT */}
            <div className="flex-1 overflow-y-auto p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* BASIC */}
                {tab === "basic" && (
                  <>
                    <div>
                      <label className="label">
                        Vendor <Req />
                      </label>
                      <input
                        className={inputClass("vendor")}
                        placeholder="e.g. AWS, Office Depot"
                        value={form.vendor}
                        onChange={(e) =>
                          setForm({ ...form, vendor: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <label className="label">
                        Expense Type <Req />
                      </label>
                      <input
                        className={inputClass("expenseType")}
                        placeholder="e.g. Software, Office Supplies"
                        value={form.expenseType}
                        onChange={(e) =>
                          setForm({ ...form, expenseType: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <label className="label">
                        Project / Purpose
                      </label>
                      <input
                        className="input"
                        value={form.project}
                        onChange={(e) =>
                          setForm({ ...form, project: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <label className="label">
                        Category
                      </label>
                      <input
                        className="input"
                        value={form.category}
                        onChange={(e) =>
                          setForm({ ...form, category: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <label className="label">
                        Bill / Invoice No
                      </label>
                      <input
                        className="input"
                        value={form.billNo}
                        onChange={(e) =>
                          setForm({ ...form, billNo: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <label className="label">
                        Base Amount (₹) <Req />
                      </label>
                      <input
                        type="number"
                        className={inputClass("amount")}
                        value={form.amount}
                        onChange={(e) =>
                          setForm({ ...form, amount: e.target.value })
                        }
                      />
                    </div>
                  </>
                )}

                {/* PAYMENT */}
                {tab === "payment" && (
                  <>
                    <div>
                      <label className="label">
                        Payment Method <Req />
                      </label>
                      <select
                        className={inputClass("method")}
                        value={form.method}
                        onChange={(e) =>
                          setForm({ ...form, method: e.target.value })
                        }
                      >
                        <option value="">Select Method</option>
                        <option>Bank Transfer</option>
                        <option>UPI</option>
                        <option>Cash</option>
                        <option>Cheque</option>
                      </select>
                    </div>

                    <div>
                      <label className="label">
                        Transaction / UTR ID
                      </label>
                      <input
                        className={inputClass("transactionId")}
                        value={form.transactionId}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            transactionId: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <label className="label">
                        Bank / Wallet
                      </label>
                      <select
                        className="input"
                        value={form.bank}
                        onChange={(e) =>
                          setForm({ ...form, bank: e.target.value })
                        }
                      >
                        <option value="">Select Bank / Wallet</option>
                        {bankAccounts.map((b) => (
                          <option key={b.id} value={`${b.bankName} - ${b.accountNumber}`}>
                            {b.bankName} - {b.accountNumber}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="label">
                        Paid Date <Req />
                      </label>
                      <input
                        type="date"
                        className={inputClass("paidDate")}
                        value={form.paidDate}
                        onChange={(e) =>
                          setForm({ ...form, paidDate: e.target.value })
                        }
                      />
                    </div>

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
                        <option>Paid</option>
                        <option>Pending</option>
                      </select>
                    </div>
                  </>
                )}

                {/* TAX */}
                {tab === "tax" && (
                  <>
                    <div>
                      <label className="label">
                        Apply GST?
                      </label>
                      <select
                        className="input"
                        value={form.gstApplied}
                        onChange={(e) =>
                          setForm({ ...form, gstApplied: e.target.value })
                        }
                      >
                        <option>No</option>
                        <option>Yes</option>
                      </select>
                    </div>

                    {form.gstApplied === "Yes" && (
                      <>
                        <div>
                          <label className="label">
                            GST %
                          </label>
                          <input
                            type="number"
                            className="input"
                            value={form.gstPercent}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                gstPercent: e.target.value,
                              })
                            }
                          />
                        </div>

                        <div>
                          <label className="label">
                            Vendor GSTIN
                          </label>
                          <input
                            className="input"
                            value={form.vendorGstin}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                vendorGstin: e.target.value,
                              })
                            }
                          />
                        </div>

                        <div>
                          <label className="label">
                            ITC Eligible
                          </label>
                          <select
                            className="input"
                            value={form.itcEligible}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                itcEligible: e.target.value,
                              })
                            }
                          >
                            <option>No</option>
                            <option>Yes</option>
                          </select>
                        </div>

                        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 md:p-6 bg-brand-50 rounded-2xl border border-brand-100">
                          <div>
                            <p className="text-xs text-brand-600 font-bold uppercase tracking-wide">
                              GST Amount
                            </p>
                            <p className="text-2xl font-bold text-slate-800">
                              ₹{form.gstAmount || "0.00"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-brand-600 font-bold uppercase tracking-wide">
                              Net Total
                            </p>
                            <p className="text-2xl font-bold text-brand-700">
                              ₹{form.netAmount || "0.00"}
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* INTERNAL */}
                {tab === "internal" && (
                  <>
                    <div>
                      <label className="label">
                        Staff
                      </label>
                      <input
                        className="input"
                        value={form.staff}
                        onChange={(e) =>
                          setForm({ ...form, staff: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <label className="label">
                        Department
                      </label>
                      <input
                        className="input"
                        value={form.department}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            department: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="label">
                        Notes
                      </label>
                      <textarea
                        className="input min-h-[120px]"
                        value={form.notes}
                        onChange={(e) =>
                          setForm({ ...form, notes: e.target.value })
                        }
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* FOOTER */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-white flex-shrink-0">
              <button onClick={() => setOpenForm(false)} className="btn-secondary">Cancel</button>
              <button
                onClick={handleSave}
                className="btn-primary"
              >
                Save Expense
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
