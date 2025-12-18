import { useEffect, useState } from "react";
import { Eye, Edit2, Trash2 } from "lucide-react";

const STORAGE_KEY = "expense_records";

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
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [tab, setTab] = useState("basic");

  const [openForm, setOpenForm] = useState(false);
  const [openView, setOpenView] = useState(false);

  const [editIndex, setEditIndex] = useState(null);
  const [viewItem, setViewItem] = useState(null);

  /* LOAD FROM STORAGE */
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    setData(saved);
  }, []);

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

  const syncStorage = (records) => {
    setData(records);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  };

  const openAdd = () => {
    setForm(emptyForm);
    setErrors({});
    setEditIndex(null);
    setTab("basic");
    setOpenForm(true);
  };

  const openEdit = (item, index) => {
    setForm(item);
    setErrors({});
    setEditIndex(index);
    setTab("basic");
    setOpenForm(true);
  };

  const openViewModal = (item) => {
    setViewItem(item);
    setOpenView(true);
  };

  const deleteExpense = (index) => {
    if (!window.confirm("Delete this expense record?")) return;
    syncStorage(data.filter((_, i) => i !== index));
  };

  const validate = () => {
    const e = {};
    if (!form.vendor) e.vendor = "Vendor required";
    if (!form.expenseType) e.expenseType = "Expense type required";
    if (!form.amount) e.amount = "Amount required";
    if (!form.method) e.method = "Payment method required";
    if (!form.paidDate) e.paidDate = "Paid date required";
    if (form.method !== "Cash" && !form.transactionId) {
      e.transactionId = "Transaction ID required";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const saveExpense = () => {
    if (!validate()) return;
    const updated =
      editIndex !== null
        ? data.map((d, i) => (i === editIndex ? form : d))
        : [...data, form];
    syncStorage(updated);
    setOpenForm(false);
  };

  const inputClass = (f) =>
    `input ${errors[f] ? "border-red-500" : ""}`;
  const Req = () => <span className="text-red-500 ml-1">*</span>;

  return (
    <div className="p-6 space-y-6 font-sans">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Expense</h1>
        <button
          onClick={openAdd}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition font-semibold"
        >
          + Add Expense
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow overflow-x-auto border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50/50 text-xs text-gray-500 uppercase border-b border-gray-100">
            <tr>
              <th className="p-4 text-left font-semibold">Vendor</th>
              <th className="p-4 text-left font-semibold">Expense Type</th>
              <th className="p-4 text-left font-semibold">Amount</th>
              <th className="p-4 text-left font-semibold">Method</th>
              <th className="p-4 text-left font-semibold">Date</th>
              <th className="p-4 text-center font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-10 text-center text-gray-500">
                  No expense records found
                </td>
              </tr>
            ) : (
              data.map((item, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="p-4">{item.vendor}</td>
                  <td className="p-4">{item.expenseType}</td>
                  <td className="p-4 font-bold">₹{item.amount}</td>
                  <td className="p-4">{item.method}</td>
                  <td className="p-4">{item.paidDate}</td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-3">
                      <button
                        onClick={() => openViewModal(item)}
                        className="p-2 text-sky-600 hover:bg-sky-50 rounded"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => openEdit(item, i)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => deleteExpense(i)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
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

      {/* VIEW MODAL */}
      {openView && viewItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white max-w-2xl w-full rounded-xl p-8 shadow-2xl">
            <h2 className="text-xl font-bold mb-6">Expense Details</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm">
              {Object.entries(viewItem).map(([k, v]) => (
                <div key={k}>
                  <p className="text-gray-400 uppercase text-xs">{k}</p>
                  <p className="font-semibold">{v || "-"}</p>
                </div>
              ))}
            </div>
            <div className="text-right mt-6">
              <button onClick={() => setOpenView(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* FORM MODAL */}
      {openForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-5xl rounded-xl p-8 shadow-2xl max-h-[90vh] flex flex-col">
            <h2 className="text-xl font-bold mb-4">
              {editIndex !== null ? "Edit Expense" : "Add Expense"}
            </h2>

            {/* TABS */}
            <div className="flex gap-1 border-b mb-6">
              {["basic", "payment", "tax", "internal"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-6 py-2 text-sm font-semibold uppercase rounded-t-lg ${
                    tab === t
                      ? "bg-indigo-600 text-white"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* TAB CONTENT */}
            <div className="grid md:grid-cols-2 gap-5 overflow-y-auto p-4">
              {/* BASIC */}
              {tab === "basic" && (
                <>
                  <label>
                    Vendor <Req />
                    <input
                      className={inputClass("vendor")}
                      value={form.vendor}
                      onChange={(e) =>
                        setForm({ ...form, vendor: e.target.value })
                      }
                    />
                  </label>

                  <label>
                    Expense Type <Req />
                    <input
                      className={inputClass("expenseType")}
                      value={form.expenseType}
                      onChange={(e) =>
                        setForm({ ...form, expenseType: e.target.value })
                      }
                    />
                  </label>

                  <label>
                    Project / Purpose
                    <input
                      className="input"
                      value={form.project}
                      onChange={(e) =>
                        setForm({ ...form, project: e.target.value })
                      }
                    />
                  </label>

                  <label>
                    Category
                    <input
                      className="input"
                      value={form.category}
                      onChange={(e) =>
                        setForm({ ...form, category: e.target.value })
                      }
                    />
                  </label>

                  <label>
                    Bill / Invoice No
                    <input
                      className="input"
                      value={form.billNo}
                      onChange={(e) =>
                        setForm({ ...form, billNo: e.target.value })
                      }
                    />
                  </label>

                  <label>
                    Base Amount (₹) <Req />
                    <input
                      type="number"
                      className={inputClass("amount")}
                      value={form.amount}
                      onChange={(e) =>
                        setForm({ ...form, amount: e.target.value })
                      }
                    />
                  </label>
                </>
              )}

              {/* PAYMENT */}
              {tab === "payment" && (
                <>
                  <label>
                    Payment Method <Req />
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
                  </label>

                  <label>
                    Transaction / UTR ID
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
                  </label>

                  <label>
                    Bank / Wallet
                    <input
                      className="input"
                      value={form.bank}
                      onChange={(e) =>
                        setForm({ ...form, bank: e.target.value })
                      }
                    />
                  </label>

                  <label>
                    Paid Date <Req />
                    <input
                      type="date"
                      className={inputClass("paidDate")}
                      value={form.paidDate}
                      onChange={(e) =>
                        setForm({ ...form, paidDate: e.target.value })
                      }
                    />
                  </label>

                  <label>
                    Status
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
                  </label>
                </>
              )}

              {/* TAX */}
              {tab === "tax" && (
                <>
                  <label>
                    Apply GST?
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
                  </label>

                  {form.gstApplied === "Yes" && (
                    <>
                      <label>
                        GST %
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
                      </label>

                      <label>
                        Vendor GSTIN
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
                      </label>

                      <label>
                        ITC Eligible
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
                      </label>

                      <div className="md:col-span-2 grid grid-cols-2 gap-4 p-4 bg-gray-50 border rounded-lg">
                        <div>
                          <p className="text-xs text-gray-500 font-bold">
                            GST Amount
                          </p>
                          <p className="text-lg font-bold">
                            ₹{form.gstAmount || "0.00"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-bold">
                            Net Total
                          </p>
                          <p className="text-lg font-bold text-indigo-600">
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
                  <label>
                    Staff
                    <input
                      className="input"
                      value={form.staff}
                      onChange={(e) =>
                        setForm({ ...form, staff: e.target.value })
                      }
                    />
                  </label>

                  <label>
                    Department
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
                  </label>

                  <label className="md:col-span-2">
                    Notes
                    <textarea
                      className="input h-32"
                      value={form.notes}
                      onChange={(e) =>
                        setForm({ ...form, notes: e.target.value })
                      }
                    />
                  </label>
                </>
              )}
            </div>

            {/* FOOTER */}
            <div className="flex justify-end gap-3 mt-6 border-t pt-4">
              <button onClick={() => setOpenForm(false)}>Cancel</button>
              <button
                onClick={saveExpense}
                className="bg-indigo-600 text-white px-8 py-2 rounded-lg"
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
